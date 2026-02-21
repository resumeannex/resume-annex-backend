"""
Simple HTTP server for the AI‑powered Resume Annex application (revamped).

This script serves static files (HTML, CSS, JavaScript) from the current
directory and exposes a minimal API endpoint at `/api/scan` to analyze a
resume against a job description. It attempts to call the OpenAI ChatGPT
API (if an `OPENAI_API_KEY` environment variable is set) to compute a
match score and identify missing keywords. If the API key is not configured
or the request fails, a fallback algorithm performs a basic keyword match.

Usage:

    # In the directory containing this file and the website assets
    export OPENAI_API_KEY="your-openai-api-key"
    python server.py

The server listens on port 8000 by default. You can specify a different
port by setting the `PORT` environment variable.
"""

import http.server
import socketserver
import os
import json
import re
from typing import Dict, Any

import requests

# Use environment variable PORT if set, otherwise default to 8000
PORT = int(os.environ.get("PORT", 8000))
# Optional OpenAI API key. You can either set the `OPENAI_API_KEY` environment variable
# before running this server or replace the placeholder string below with your actual
# OpenAI secret key. Storing secrets directly in source code is generally not
# recommended for production use, but this fallback allows novices to get up and
# running quickly. If neither the environment variable nor the constant is set,
# the server will fall back to a local keyword match algorithm.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or ""
if not OPENAI_API_KEY:
    # Replace the empty string below with your OpenAI API key if you prefer to
    # hardcode it. Otherwise set the environment variable OPENAI_API_KEY.
    OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"


def fallback_analysis(resume: str, job_description: str) -> Dict[str, Any]:
    """Compute a simple match score and list of missing keywords without OpenAI."""
    # Define a small set of stopwords to ignore common terms
    stopwords = {
        "the", "and", "a", "to", "of", "in", "for", "on", "with", "as", "at",
        "by", "an", "or", "be", "is", "are", "this", "that", "from", "your",
        "you", "we", "our", "their"
    }
    # Tokenize the job description and resume by splitting on non‑word characters
    job_tokens = {
        tok.lower() for tok in re.split(r"\W+", job_description) if tok and tok.lower() not in stopwords
    }
    resume_tokens = {
        tok.lower() for tok in re.split(r"\W+", resume) if tok
    }
    if not job_tokens:
        return {"match_score": 0, "missing_keywords": []}
    # Determine which tokens are present and which are missing
    matched = job_tokens & resume_tokens
    missing = job_tokens - resume_tokens
    # Calculate a basic percentage match score
    score = int((len(matched) / len(job_tokens)) * 100)
    return {
        "match_score": score,
        # Return at most 10 missing keywords, sorted for consistency
        "missing_keywords": sorted(list(missing))[:10],
    }


def call_openai(resume: str, job_description: str) -> Dict[str, Any]:
    """Call OpenAI's chat completions API to analyze the resume and job description."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    # System prompt instructs ChatGPT to act as an ATS/resume comparison expert
    system_prompt = (
        "You are an expert resume reviewer and applicant tracking system (ATS) specialist. "
        "When given a resume and a job description, you compare the required skills "
        "and responsibilities with those found in the resume. You must produce a JSON "
        "object with two fields: match_score (an integer from 0 to 100 representing the percentage "
        "match) and missing_keywords (an array of strings listing important skills or terms from "
        "the job description that are absent from the resume). Do not include any other fields."
    )
    user_prompt = (
        f"Job description:\n{job_description}\n\n"
        f"Resume:\n{resume}\n\n"
        "Return the analysis as JSON with keys 'match_score' and 'missing_keywords'."
    )
    data = {
        "model": "gpt-4-1106-preview",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        # Ask for JSON object response if available
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    resp = requests.post(url, headers=headers, json=data, timeout=30)
    resp.raise_for_status()
    result = resp.json()
    # Extract the assistant's content and parse as JSON
    content = result["choices"][0]["message"]["content"]
    return json.loads(content)


class ResumeAnnexHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler that serves static files and the /api/scan endpoint."""

    def translate_path(self, path: str) -> str:
        """Resolve file system paths for static file serving."""
        root = os.path.dirname(os.path.abspath(__file__))
        # Strip query parameters and fragments
        path = path.split('?', 1)[0].split('#', 1)[0]
        # Normalize path to prevent directory traversal
        path = os.path.normpath(path.lstrip('/'))
        return os.path.join(root, path)

    def end_headers(self) -> None:
        """Add CORS headers for the API responses."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self) -> None:
        """Respond to CORS preflight requests."""
        self.send_response(204)
        self.end_headers()

    def do_POST(self) -> None:
        if self.path == '/api/scan':
            # Read request body
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode('utf-8'))
                return
            resume = data.get('resume', '')
            job_description = data.get('job_description', '')
            if not resume or not job_description:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Both 'resume' and 'job_description' are required."}).encode('utf-8'))
                return
            # Try OpenAI, fall back on failure
            try:
                result = call_openai(resume, job_description)
            except Exception:
                result = fallback_analysis(resume, job_description)
            # Respond with JSON
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
        else:
            # For other POST paths, return 404
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = ResumeAnnexHandler
    with socketserver.TCPServer(('', PORT), handler) as httpd:
        print(f'Serving Resume Annex AI Revamp on port {PORT}')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass