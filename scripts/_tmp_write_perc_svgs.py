from pathlib import Path

svgs = {
    "glockenspiel": "M8 18h48v28H8V18zm4 4h5v8H12V22zm7 0h5v8h-5V22zm7 0h5v8h-5V22zm7 0h5v8h-5V22zm7 0h5v8h-5V22zm7 0h5v8h-5V22zM14 34h4v8h-4v-8zm7 0h4v8h-4v-8zm7 0h4v8h-4v-8zm7 0h4v8h-4v-8zm7 0h4v8h-4v-8zm7 0h4v8h-4v-8z",
    "congas": "M14 10c-6 0-10 4-10 10v28c0 6 4 10 10 10s10-4 10-10V20c0-6-4-10-10-10zm0 6c2.8 0 4 2 4 4v28c0 2-1.2 4-4 4s-4-2-4-4V20c0-2 1.2-4 4-4zm26-6c-6 0-10 4-10 10v28c0 6 4 10 10 10s10-4 10-10V20c0-6-4-10-10-10zm0 6c2.8 0 4 2 4 4v28c0 2-1.2 4-4 4s-4-2-4-4V20c0-2 1.2-4 4-4z",
    "guiro": "M10 26c0-6 8-10 22-10s22 4 22 10v12c0 6-8 10-22 10S10 44 10 38V26zm6 2v12c0 2 5 4 16 4s16-2 16-4V28c0-2-5-4-16-4s-16 2-16 4zm4 4h24v2H20v-2zm0 5h24v2H20v-2zm0 5h24v2H20v-2zM48 14l10 6-2 4-10-6 2-4z",
    "crystal-glasses": "M8 12h8l-1 18H9L8 12zm2 22h4v16h-4V34zm12-22h8l-1 18h-6l-1-18zm2 22h4v16h-4V34zm12-22h8l-1 18h-6l-1-18zm2 22h4v16h-4V34zm12-22h8l-1 18h-6l-1-18zm2 22h4v16h-4V34zm-40 18h48v4H10v-4z",
    "metal-chimes": "M8 8h48v4H8V8zm4 6h2v40h-2V14zm5 4h2v36h-2V18zm5 2h2v34h-2V20zm5 4h2v30h-2V24zm5 2h2v28h-2V26zm5 4h2v24h-2V30zm5 2h2v22h-2V32zm5 4h2v18h-2V36zm5 2h2v16h-2V38zM28 54h8v4h-8v-4z",
    "tam-tam": "M12 6h4v52h-4V6zm36 0h4v52h-4V6zM16 8h32v4H16V8zM32 14c-12 0-22 10-22 22s10 22 22 22 22-10 22-22-10-22-22-22zm0 6c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm0 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z",
    "bongo": "M8 16c0-6 7-10 16-10s16 4 16 10v28c0 6-7 10-16 10S8 50 8 44V16zm6 2v26c0 2 4 4 10 4s10-2 10-4V18c0-2-4-4-10-4s-10 2-10 4zm26 2c0-5 5-8 12-8s12 3 12 8v24c0 5-5 8-12 8s-12-3-12-8V20zm6 2v20c0 1.5 2.5 3 6 3s6-1.5 6-3V22c0-1.5-2.5-3-6-3s-6 1.5-6 3z",
}

out = Path("public/stage-plot/icons")
for name, d in svgs.items():
    content = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">\n'
        f"  <!-- OFRN: {name} -->\n"
        f'  <path fill="currentColor" d="{d}"/>\n'
        "</svg>\n"
    )
    (out / f"{name}.svg").write_text(content, encoding="utf-8")
    print("wrote", name)
