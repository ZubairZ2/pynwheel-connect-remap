#!/usr/bin/env python3
"""
Patches all .so files in the release AAB to use 16KB page alignment.
Run AFTER building the AAB, BEFORE uploading to Play Store.

Usage:
    python3 scripts/patch-16kb-alignment.py

Then re-sign:
    jarsigner -sigalg SHA256withRSA -digestalg SHA-256 \
        -keystore android/app/selftour-key.keystore \
        -storepass selftour -keypass selftour \
        android/app/build/outputs/bundle/selftourRelease/app-selftour-release.aab \
        selftour-key-alias
"""
import struct, zipfile, shutil, os

AAB = "android/app/build/outputs/bundle/selftourRelease/app-selftour-release.aab"
AAB_OUT = AAB + ".patched"

def patch_so(data):
    if data[:4] != b'\x7fELF': return data, False
    ei_class = data[4]
    if ei_class == 1:
        fmt, sz, po, pso, ao = '<I', 4, 28, 42, 28
    elif ei_class == 2:
        fmt, sz, po, pso, ao = '<Q', 8, 32, 54, 48
    else: return data, False
    phoff = struct.unpack_from(fmt, data, po)[0]
    phentsz = struct.unpack_from('<H', data, pso)[0]
    phnum = struct.unpack_from('<H', data, pso + 2)[0]
    data = bytearray(data)
    mod = False
    for i in range(phnum):
        off = phoff + i * phentsz
        if struct.unpack_from('<I', data, off)[0] == 1:  # PT_LOAD
            if struct.unpack_from(fmt, data, off + ao)[0] < 16384:
                struct.pack_into(fmt, data, off + ao, 16384)
                mod = True
    return bytes(data), mod

if not os.path.exists(AAB):
    print(f"AAB not found: {AAB}")
    exit(1)

count = 0
with zipfile.ZipFile(AAB, 'r') as zi:
    with zipfile.ZipFile(AAB_OUT, 'w', zipfile.ZIP_DEFLATED) as zo:
        for item in zi.infolist():
            d = zi.read(item.filename)
            if item.filename.endswith('.so'):
                d, p = patch_so(d)
                if p: count += 1
            zo.writestr(item, d)

shutil.move(AAB_OUT, AAB)
print(f"Patched {count} .so files for 16KB alignment")
print(f"Now re-sign the AAB with jarsigner (see usage above)")
