#!/usr/bin/env python3
# BetMC Texture Generator Pro - Node.js Direct Launch
import os
import sys
import subprocess

def start_node_server():
    """Start Node.js server on port 5000"""
    print("🚀 Starting BetMC Texture Generator Pro on port 5000...")
    
    # Kill any existing processes on port 5000
    os.system("pkill -f 'node server.js' 2>/dev/null || true")
    os.system("pkill -f gunicorn 2>/dev/null || true")
    os.system("fuser -k 5000/tcp 2>/dev/null || true")
    
    # Set environment variable for port 5000
    os.environ['PORT'] = '5000'
    
    # Start Node.js server directly
    try:
        subprocess.run(['node', 'server.js'], check=True)
    except Exception as e:
        print(f"❌ Error starting Node.js server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_node_server()

# Simple Flask app for gunicorn compatibility
from flask import Flask, redirect

app = Flask(__name__)

@app.route('/')
def index():
    # Redirect to the Node.js server on port 5000
    return redirect("http://localhost:5000")

@app.route('/<path:path>')
def proxy(path):
    # Redirect all other routes to Node.js server
    return redirect(f"http://localhost:5000/{path}")

# Auto-start Node.js server when imported by gunicorn
import threading
node_thread = threading.Thread(target=start_node_server, daemon=True)
node_thread.start()
import time
import requests
import random
import os
import threading

# รายการไฟล์ GitHub RAW สาธารณะ (ขนาด < 30MB)
GITHUB_FILES = [
    "https://raw.githubusercontent.com/vinta/awesome-python/master/README.md",
    "https://raw.githubusercontent.com/github/gitignore/main/Python.gitignore",
    "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md",
    "https://raw.githubusercontent.com/EbookFoundation/free-programming-books/main/books/free-programming-books.md",
    "https://raw.githubusercontent.com/torvalds/linux/master/README",
    "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt"
]

def github_file_downloader():
    while True:
        file_url = random.choice(GITHUB_FILES)
        filename = f"temp_{int(time.time())}.tmp"
        print(f"[INFO] เลือกไฟล์: {file_url}")
        try:
            r = requests.get(file_url, headers={"User-Agent": "Mozilla/5.0"}, stream=True)
            size = int(r.headers.get("Content-Length", 0))
            if size > 30 * 1024 * 1024:
                print(f"[SKIP] ไฟล์ใหญ่เกิน 30MB ({size/1024/1024:.2f} MB) ข้าม...")
                time.sleep(10)
                continue
            with open(filename, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"[SUCCESS] ดาวน์โหลดเสร็จ: {filename} ({size/1024:.2f} KB)")
        except Exception as e:
            print(f"[ERROR] {e}")
        time.sleep(5)
        if os.path.exists(filename):
            os.remove(filename)
            print(f"[INFO] ลบไฟล์ {filename} เรียบร้อย")
        print("[KEEPALIVE] Replit ยังทำงานอยู่...")
        time.sleep(60)

# รันตัวดาวน์โหลดไฟล์เป็น thread แยก
dl_thread = threading.Thread(target=github_file_downloader, daemon=True)
dl_thread.start()