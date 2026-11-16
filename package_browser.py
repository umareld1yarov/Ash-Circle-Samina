"""Package the playable offline browser build without Android keys/build files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent
out = root / 'releases/ash-circle-browser.zip'
out.parent.mkdir(exist_ok=True)
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for name in ['index.html', 'style.css', 'controls.js', 'combat.js', 'renderer3d.js', 'game.js', 'README.md']:
        archive.write(root / name, name)
    for folder in ['assets', 'vendor']:
        for path in sorted((root / folder).rglob('*')):
            if path.is_file() and not path.name.startswith('.'):
                archive.write(path, path.relative_to(root))
print(out)
