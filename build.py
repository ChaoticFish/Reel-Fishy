#!/usr/bin/env python3
"""
Build Reel Fishy: pkg_reelfishy.

    python3 build.py

What it does, in order (any failed check stops the build):
  1. Version check: the package manifest's version must match both plugin
     manifests, the player and popup headers, the player's ReelFishy.version,
     and the README (version line, install zip name, changelog entry).
  2. Manifest check: the package has <scriptfile> and the <updateservers>
     collection tag; the plugins have no update server of their own.
  3. CSS check: properties alphabetical in every one-line rule of the player
     and popup CSS (@keyframes / @media / :host / :root blocks are skipped).
  4. PHP lint (when php is installed).
  5. Minify the player: reel-fishy.js -> reel-fishy.min.js (terser).
  6. Zips, into dist/:
       pkg_reelfishy-<v>.zip          the install zip
       pkg_reelfishy-<v>-source.zip   everything, including this script
     Zips are deterministic (sorted, fixed timestamps), so rebuilding the same
     source gives the same bytes and the same checksum.
  7. Update XML: when the shared generator is found (CFD_UPDATES, or the
     sibling folder ../cfd-updates), calls cfd_update.release(). Without it,
     the build still finishes and says so.

(C) 2026 Chaotic Fish Design. GPL v2 or later.
"""

import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
KEY = 'pkg_reelfishy'          # registry key and file name
PACKAGENAME = 'reelfishy'
CHILDREN = ['plg_system_reelfishy', 'plg_editors-xtd_reelfishy']
PLAYER = os.path.join(ROOT, 'packages', 'plg_system_reelfishy', 'media', 'js', 'reel-fishy.js')
PLAYER_MIN = PLAYER[:-3] + '.min.js'
POPUP = os.path.join(ROOT, 'packages', 'plg_editors-xtd_reelfishy', 'media', 'js', 'insert.js')
DIST = os.path.join(ROOT, 'dist')
UPDATE_URL = 'https://chaoticfishdesign.com/updates/cfd.xml'
# fixed timestamp for every zip entry, so the zip only changes when a file does
ZIP_TIME = (2026, 1, 1, 0, 0, 0)
SKIP = {'.DS_Store', 'Thumbs.db', '__pycache__', '.git', 'dist', 'node_modules'}


def fail(msg):
    print('✗ ' + msg)
    sys.exit(1)


def ok(msg):
    print('✓ ' + msg)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def manifest(path):
    try:
        return ET.parse(path).getroot()
    except ET.ParseError as e:
        fail(f'{os.path.relpath(path, ROOT)} is not valid XML: {e}')


# ---------- 1 + 2: versions and manifests ----------

def check_versions():
    pkg = manifest(os.path.join(ROOT, KEY + '.xml'))
    version = (pkg.findtext('version') or '').strip()
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        fail(f'package version "{version}" is not x.y.z')

    if pkg.get('type') != 'package':
        fail('pkg_reelfishy.xml is not type="package"')
    if (pkg.findtext('packagename') or '').strip() != PACKAGENAME:
        fail(f'packagename must stay "{PACKAGENAME}" (it is the update element)')
    if (pkg.findtext('scriptfile') or '').strip() != 'script.php' or not os.path.isfile(os.path.join(ROOT, 'script.php')):
        fail('package needs <scriptfile>script.php</scriptfile> and the file')
    server = pkg.find('updateservers/server')
    if server is None or (server.text or '').strip() != UPDATE_URL or server.get('type') != 'collection':
        fail(f'package needs the <updateservers> collection tag pointing at {UPDATE_URL}')

    for child in CHILDREN:
        m = manifest(os.path.join(ROOT, 'packages', child, 'reelfishy.xml'))
        v = (m.findtext('version') or '').strip()
        if v != version:
            fail(f'{child} manifest says {v}, package says {version}')
        if m.find('updateservers') is not None:
            fail(f'{child} has its own <updateservers>; only the package carries it')

    player, popup, readme = read(PLAYER), read(POPUP), read(os.path.join(ROOT, 'README.md'))
    checks = [
        (f'— v{version}\n' in player, 'player header (reel-fishy.js) "— v' + version + '"'),
        (f"version: '{version}'," in player, "player ReelFishy.version '" + version + "'"),
        (f' * {version} — ' in player, 'player changelog line for ' + version),
        (f'popup, v{version}\n' in popup, 'popup header (insert.js) "v' + version + '"'),
        (f'**Version:** {version} ' in readme, 'README version line'),
        (f'`pkg_reelfishy-{version}.zip`' in readme, 'README install zip name'),
        (f'\n### {version}\n' in readme, 'README changelog entry "### ' + version + '"'),
    ]
    for good, what in checks:
        if not good:
            fail(f'version {version} missing from: {what}')
    ok(f'version {version} everywhere; packagename "{PACKAGENAME}"; update server tag on the package only')
    return version


# ---------- 3: CSS property order ----------

def css_block(src, name):
    m = re.search(r'const CSS = `(.*?)`;', src, re.S)
    if not m:
        fail(f'no CSS block found in {name}')
    return m.group(1)


def check_css():
    bad = []
    for path in (PLAYER, POPUP):
        css = css_block(read(path), os.path.basename(path))
        for m in re.finditer(r'^([^@\s{}][^{}\n]*)\{([^{}\n]+)\}$', css, re.M):
            sel = m.group(1).strip()
            if sel.startswith((':host', ':root')):
                continue
            props = [d.split(':')[0].strip() for d in m.group(2).split(';') if d.strip()]
            if props != sorted(props):
                bad.append(f'{os.path.basename(path)}: {sel}')
    if bad:
        fail('CSS properties out of order:\n  ' + '\n  '.join(bad))
    ok('CSS properties alphabetical')


# ---------- 4: PHP lint ----------

def lint_php():
    php = shutil.which('php')
    if not php:
        print('· php not installed here; PHP lint skipped')
        return
    files = []
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP]
        files += [os.path.join(base, n) for n in names if n.endswith('.php')]
    for f in sorted(files):
        r = subprocess.run([php, '-l', f], capture_output=True, text=True)
        if r.returncode:
            fail(f'PHP syntax error in {os.path.relpath(f, ROOT)}:\n{r.stdout}{r.stderr}')
    ok(f'PHP lint ({len(files)} files)')


# ---------- 5: minify ----------

def minify():
    terser = shutil.which('terser')
    cmd = [terser] if terser else ([shutil.which('npx'), '--yes', 'terser@5'] if shutil.which('npx') else None)
    if not cmd:
        fail('terser not found (npm install -g terser), needed to minify the player')
    r = subprocess.run(cmd + [PLAYER, '-c', '-m', '--comments', '/^!/', '-o', PLAYER_MIN], capture_output=True, text=True)
    if r.returncode:
        fail('terser failed:\n' + r.stderr)
    if '</script' in read(PLAYER_MIN).lower():
        fail('minified player contains "</script", which would break inline use')
    ok(f'minified player: {os.path.getsize(PLAYER_MIN) // 1024} KB')


# ---------- 6: zips ----------

def add_tree(z, folder, prefix=''):
    for base, dirs, names in os.walk(folder):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        for n in sorted(names):
            if n in SKIP:
                continue
            path = os.path.join(base, n)
            add_file(z, path, prefix + os.path.relpath(path, folder).replace(os.sep, '/'))


def add_file(z, path, arcname):
    info = zipfile.ZipInfo(arcname, ZIP_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    with open(path, 'rb') as f:
        z.writestr(info, f.read())


def add_bytes(z, data, arcname):
    info = zipfile.ZipInfo(arcname, ZIP_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    z.writestr(info, data)


def build_zips(version):
    os.makedirs(DIST, exist_ok=True)
    tmp = os.path.join(DIST, '_children')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    for child in CHILDREN:
        with zipfile.ZipFile(os.path.join(tmp, child + '.zip'), 'w') as z:
            add_tree(z, os.path.join(ROOT, 'packages', child))

    install = os.path.join(DIST, f'{KEY}-{version}.zip')
    with zipfile.ZipFile(install, 'w') as z:
        for n in (KEY + '.xml', 'script.php', 'LICENSE.txt', 'README.md'):
            add_file(z, os.path.join(ROOT, n), n)
        for child in CHILDREN:
            add_file(z, os.path.join(tmp, child + '.zip'), f'packages/{child}.zip')
    shutil.rmtree(tmp)

    source = os.path.join(DIST, f'{KEY}-{version}-source.zip')
    with zipfile.ZipFile(source, 'w') as z:
        add_tree(z, ROOT, f'{KEY}-{version}/')

    # read the install zip back: the manifest Joomla will see
    with zipfile.ZipFile(install) as z:
        names = z.namelist()
        root = ET.fromstring(z.read(KEY + '.xml'))
        if (root.findtext('version') or '').strip() != version or root.find('updateservers') is None:
            fail('the install zip has the wrong manifest')
        for child in CHILDREN:
            if f'packages/{child}.zip' not in names:
                fail(f'{child}.zip missing from the install zip')
    ok(f'dist/{os.path.basename(install)} ({os.path.getsize(install) // 1024} KB)')
    ok(f'dist/{os.path.basename(source)} ({os.path.getsize(source) // 1024} KB)')
    return install


# ---------- 7: update XML ----------

def update_xml(install):
    folder = os.environ.get('CFD_UPDATES') or os.path.join(os.path.dirname(ROOT), 'cfd-updates')
    if not os.path.isfile(os.path.join(folder, 'cfd_update.py')):
        print(f'· cfd-updates not found ({folder}); no update XML written. '
              f'Run it later: python3 cfd_update.py release {KEY} <zip>')
        return
    sys.path.insert(0, folder)
    try:
        import cfd_update
    except Exception as e:  # noqa: BLE001 - report and finish the build
        print(f'· could not load cfd_update ({e}); no update XML written')
        return
    fail_type = getattr(cfd_update, 'Fail', Exception)
    try:
        cfd_update.release(KEY, install)
    except fail_type as e:
        print(f'· cfd_update did not write the update XML: {e}')
        return
    ok('update XML written by cfd_update (upload <element>.xml and cfd.xml to /updates/)')


def main():
    print('Building Reel Fishy')
    version = check_versions()
    check_css()
    lint_php()
    minify()
    install = build_zips(version)
    update_xml(install)
    print()
    print(f'Release {version}:')
    print(f'  install zip: dist/{os.path.basename(install)}, {os.path.getsize(install) / 1024:.0f} KB')
    print('  needs: Joomla 5 or 6, PHP 8.2+')
    print('  upload the install zip to jDownloads first, then the update XML; keep this exact zip,')
    print('  the XML checksum belongs to it.')


if __name__ == '__main__':
    main()
