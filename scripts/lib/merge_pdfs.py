#!/usr/bin/env python3
"""Merge PDFs in order into a single output. Usage: merge_pdfs.py OUT in1.pdf in2.pdf …"""
import sys
from pypdf import PdfReader, PdfWriter

out_path = sys.argv[1]
inputs = sys.argv[2:]
writer = PdfWriter()
for path in inputs:
    reader = PdfReader(path)
    for page in reader.pages:
        writer.add_page(page)
with open(out_path, "wb") as f:
    writer.write(f)
print(f"OK {len(writer.pages)} pages → {out_path}")
