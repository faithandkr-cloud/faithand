/**
 * bible-db.js
 * IndexedDB 기반 성경 데이터 관리 라이브러리
 * 성경통독 / 성경암송카드 공통 사용
 *
 * JSON 형식: { verses: [...], bookNames: {...} }
 *   verses 항목: { book, chapter, verse, text }
 *   bookNames: { "창": "창세기", ... }  (선택)
 */
const BibleDB = (() => {
  const DB_NAME    = 'BibleStorage';
  const DB_VER     = 1;
  const STORE_DATA = 'bibleData';
  const STORE_META = 'bibleMeta';

  /* ── DB 열기 ── */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_DATA))
          db.createObjectStore(STORE_DATA, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_META))
          db.createObjectStore(STORE_META, { keyPath: 'id' });
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  /* ── 저장 ── */
  async function save(verId, data, info = {}) {
    // data: { verses, bookNames }
    if (!data.verses || !Array.isArray(data.verses))
      throw new Error('verses 배열이 없습니다.');

    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction([STORE_DATA, STORE_META], 'readwrite');
      tx.objectStore(STORE_DATA).put({ id: verId, data });
      tx.objectStore(STORE_META).put({
        id: verId,
        fileName:   info.fileName   || '',
        label:      info.label      || verId,
        verseCount: data.verses.length,
        savedAt:    Date.now(),
      });
      tx.oncomplete = res;
      tx.onerror    = e => rej(e.target.error);
    });
    db.close();
  }

  /* ── 로드 ── */
  async function load(verId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_DATA, 'readonly');
      const req = tx.objectStore(STORE_DATA).get(verId);
      req.onsuccess = e => {
        db.close();
        resolve(e.target.result ? e.target.result.data : null);
      };
      req.onerror = e => { db.close(); reject(e.target.error); };
    });
  }

  /* ── 메타 정보 ── */
  async function meta(verId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get(verId);
      req.onsuccess = e => { db.close(); resolve(e.target.result || null); };
      req.onerror   = e => { db.close(); reject(e.target.error); };
    });
  }

  /* ── 삭제 ── */
  async function remove(verId) {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction([STORE_DATA, STORE_META], 'readwrite');
      tx.objectStore(STORE_DATA).delete(verId);
      tx.objectStore(STORE_META).delete(verId);
      tx.oncomplete = res;
      tx.onerror    = e => rej(e.target.error);
    });
    db.close();
  }

  /* ── 챕터 추출 (성경통독용) ──
     bible: { verses, bookNames }
     koreanName: '창세기' | '창' 등
     startCh, endCh: 장 번호 (1-based)
     반환: [{ ch, verses:[{num,text}] }, ...]
  */
  function getChapters(bible, koreanName, startCh, endCh) {
    if (!bible || !bible.verses) return [];

    // bookNames 역매핑으로 약어↔정식명 모두 매칭
    const aliases = new Set([koreanName]);
    if (bible.bookNames) {
      Object.entries(bible.bookNames).forEach(([abbr, full]) => {
        if (abbr === koreanName || full === koreanName) {
          aliases.add(abbr);
          aliases.add(full);
        }
      });
    }

    const chMap = {};
    for (const v of bible.verses) {
      if (!aliases.has(v.book)) continue;
      const ch = Number(v.chapter);
      if (ch < startCh || ch > endCh) continue;
      if (!chMap[ch]) chMap[ch] = [];
      chMap[ch].push({ num: v.verse, text: v.text });
    }

    return Object.keys(chMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(ch => ({ ch, verses: chMap[ch] }));
  }

  /* ── 단일 절 조회 (암송카드용) ──
     ref: '시편 23:1' | '요한복음 3:16'
     반환: 본문 문자열 | null
  */
  function getVerse(bible, ref) {
    if (!bible || !bible.verses) return null;
    const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!m) return null;
    const [, bookName, chStr, vsStr] = m;
    const ch = Number(chStr), vs = Number(vsStr);

    const aliases = new Set([bookName]);
    if (bible.bookNames) {
      Object.entries(bible.bookNames).forEach(([abbr, full]) => {
        if (abbr === bookName || full === bookName) {
          aliases.add(abbr); aliases.add(full);
        }
      });
    }

    for (const v of bible.verses) {
      if (aliases.has(v.book) && Number(v.chapter) === ch && Number(v.verse) === vs)
        return v.text || null;
    }
    return null;
  }

  return { save, load, meta, remove, getChapters, getVerse };
})();
