#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
commentaries/hokma 폴더 구조:
  hokma/index.json
  hokma/{book}/{chapter}.json
를 성경읽기_mobile.html 설정(⚙) > 주석 불러오기에서 쓸 수 있는
"주석_합본.json" 파일 하나로 합쳐줍니다.

사용법:
  python3 주석_합치기.py "/media/song/android/html모음/성경 html_perfect/핸드폰용 자료/commentaries/hokma"

결과:
  같은 폴더 옆에 주석_합본.json 파일이 생성됩니다.
  이 파일을 설정(⚙) > 주석 불러오기에서 선택하면 됩니다.
"""
import json, os, sys

def main():
    if len(sys.argv) < 2:
        print('사용법: python3 주석_합치기.py <hokma 폴더 경로>')
        sys.exit(1)

    base = sys.argv[1]
    index_path = os.path.join(base, 'index.json')
    if not os.path.isfile(index_path):
        print('index.json을 찾을 수 없습니다:', index_path)
        sys.exit(1)

    with open(index_path, encoding='utf-8') as f:
        index_data = json.load(f)

    combined_data = {}
    missing = []

    for book, chapters in index_data.items():
        for chapter in chapters.keys():
            chapter_path = os.path.join(base, str(book), str(chapter) + '.json')
            key = str(book) + '_' + str(chapter)
            if os.path.isfile(chapter_path):
                with open(chapter_path, encoding='utf-8') as f:
                    combined_data[key] = json.load(f)
            else:
                missing.append(chapter_path)

    result = {'index': index_data, 'data': combined_data}

    out_path = os.path.join(os.path.dirname(base.rstrip('/\\')), '주석_합본.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)

    print('완료:', out_path)
    print('총 장 수:', len(combined_data))
    if missing:
        print('찾지 못한 파일 (건너뜀):', len(missing), '개')
        for m in missing[:10]:
            print('  -', m)

if __name__ == '__main__':
    main()
