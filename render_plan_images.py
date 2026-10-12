"""Prepare lossless TV images from the same PDFs and crops used by the dashboard."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'plan-pdf.js').read_text()
manifest_path = ROOT / 'plan-images.json'
previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest = {}
for constant in ('PLAN_FILE', 'NEXT_PLAN_FILE'):
    file_match = re.search(r'export const ' + constant + r'\s*=\s*\{([^}]+)\}', source)
    crop_match = re.search(r'createPlanRenderer\(' + constant + r',\{([^}]+)\}\)', source)
    if not file_match or not crop_match:
        raise ValueError('Missing plan or crop definition for ' + constant)
    url_match = re.search(r"url:\s*['\"]([^'\"]+)['\"]", file_match[1])
    if not url_match:
        raise ValueError('Missing PDF URL for ' + constant)
    pdf = (ROOT / url_match[1]).resolve()
    if pdf.parent != ROOT or pdf.suffix.lower() != '.pdf':
        raise ValueError('Only project-local PDF files are supported')
    crop = {key: int(value) for key, value in re.findall(r'(x|y|width|height):\s*(\d+)', crop_match[1])}
    if set(crop) != {'x', 'y', 'width', 'height'}:
        raise ValueError('Invalid crop for ' + constant)
    image = pdf.with_name(pdf.stem + '-tv.png')
    signature = hashlib.sha256(pdf.read_bytes() + json.dumps(crop, sort_keys=True).encode() + b'poppler-png-144dpi-v1').hexdigest()
    manifest[image.name] = signature
    if previous.get(image.name) == signature and image.exists():
        print('Unchanged:', image.name)
        continue
    with tempfile.TemporaryDirectory() as temporary:
        prefix = str(Path(temporary) / 'plan')
        subprocess.run(['pdftoppm', '-f', '1', '-singlefile', '-r', '144',
                        '-x', str(crop['x'] * 2), '-y', str(crop['y'] * 2),
                        '-W', str(crop['width'] * 2), '-H', str(crop['height'] * 2),
                        '-png', str(pdf), prefix], check=True)
        Path(prefix + '.png').replace(image)
    print('Rendered:', image.name)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
