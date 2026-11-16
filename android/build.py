#!/usr/bin/env python3
"""Offline debug APK build using an existing Android SDK and JDK. No Gradle."""
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SDK = Path(os.environ.get('ANDROID_SDK_ROOT', Path.home() / 'Library/Android/sdk'))
JDK = Path(os.environ.get('JAVA_HOME', '/Applications/Android Studio.app/Contents/jbr/Contents/Home'))
BUILD = ROOT / 'android/build'
OUT = ROOT / 'releases'
TOOLS = SDK / 'build-tools/36.0.0'
PLATFORM = SDK / 'platforms/android-35/android.jar'
ENV = dict(os.environ, JAVA_HOME=str(JDK), PATH=str(JDK / 'bin') + os.pathsep + os.environ.get('PATH', ''))

def run(*args):
    subprocess.run([str(a) for a in args], check=True, env=ENV)

BUILD.mkdir(parents=True, exist_ok=True)
OUT.mkdir(exist_ok=True)
for directory in ['assets', 'classes', 'dex', 'res']:
    (BUILD / directory).mkdir(exist_ok=True)
shutil.rmtree(BUILD / 'assets')
(BUILD / 'assets').mkdir()
for name in ['index.html', 'style.css', 'renderer3d.js', 'controls.js', 'combat.js', 'game.js']:
    shutil.copy2(ROOT / name, BUILD / 'assets' / name)
shutil.copytree(ROOT / 'assets', BUILD / 'assets/assets')
shutil.copytree(ROOT / 'vendor', BUILD / 'assets/vendor')
run(TOOLS / 'aapt', 'package', '-f', '-M', ROOT / 'android/AndroidManifest.xml',
    '-I', PLATFORM, '-A', BUILD / 'assets', '-S', BUILD / 'res', '-F', BUILD / 'base.apk')
run(JDK / 'bin/javac', '-source', '8', '-target', '8', '-classpath', PLATFORM,
    '-d', BUILD / 'classes', ROOT / 'android/src/kg/ashcircle/game/MainActivity.java')
run(TOOLS / 'd8', '--lib', PLATFORM, '--min-api', '23', '--output', BUILD / 'dex',
    *sorted((BUILD / 'classes').rglob('*.class')))
with zipfile.ZipFile(BUILD / 'base.apk', 'a', zipfile.ZIP_DEFLATED) as apk:
    apk.write(BUILD / 'dex/classes.dex', 'classes.dex')
run(TOOLS / 'zipalign', '-f', '4', BUILD / 'base.apk', BUILD / 'aligned.apk')
key = BUILD / 'debug.keystore'
if not key.exists():
    run(JDK / 'bin/keytool', '-genkeypair', '-keystore', key, '-alias', 'androiddebugkey',
        '-storepass', 'android', '-keypass', 'android', '-dname', 'CN=Android Debug,O=Ash Circle,C=KG',
        '-keyalg', 'RSA', '-keysize', '2048', '-validity', '3650', '-noprompt')
target = OUT / 'ash-circle-android-debug.apk'
run(TOOLS / 'apksigner', 'sign', '--ks', key, '--ks-key-alias', 'androiddebugkey',
    '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', target, BUILD / 'aligned.apk')
run(TOOLS / 'apksigner', 'verify', '--verbose', target)
print('APK:', target)
