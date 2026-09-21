#!/usr/bin/env python3
"""Extract the paragraphs of a .docx as JSON: [{"text": str, "list": bool}].
Used by build-docx.js to pair the Ministry's Montenegrin originals with the English translations."""
import json, sys, zipfile
from xml.etree import ElementTree as ET
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
def para_text(p):
    out = ''
    for node in p.iter():
        tag = node.tag
        if tag == W + 't': out += node.text or ''
        elif tag == W + 'tab': out += ' '
        elif tag == W + 'br': out += '\n'
    return out
def main(path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    body = root.find(W + 'body')
    paras = []
    for el in body:
        if el.tag == W + 'p':
            t = ' '.join(para_text(el).split())
            if t: paras.append({'text': t, 'list': el.find('.//' + W + 'numPr') is not None})
        elif el.tag == W + 'tbl':
            for tr in el.findall(W + 'tr'):
                cells = [' '.join(' '.join(para_text(p).split()) for p in tc.findall(W + 'p')).strip() for tc in tr.findall(W + 'tc')]
                t = ' | '.join(c for c in cells if c)
                if t: paras.append({'text': t, 'list': False})
    json.dump(paras, sys.stdout, ensure_ascii=False)
if __name__ == '__main__': main(sys.argv[1])
