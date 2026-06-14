import { useSettings } from '@/store/settings';
import type { ProgramId, ProgramSelection } from '@/types';

// 課程コード(学籍番号の3〜4桁目) → ProgramId
const COURSE_TO_PROGRAM: Record<string, ProgramId> = {
  '21': 'elec', // 電子
  '22': 'info', // 情報
  '23': 'mech', // 機械
  '41': 'bio', // 応生
  '51': 'chem', // 応化
  '61': 'design_arch', // デザ建
};

export interface ParsedProfile {
  admissionYear: number;
  program: ProgramId;
  tech: boolean;
}

/**
 * Moodle username(学籍番号) から入学年度・課程・Tech を判定する。判別不能なら null。
 * 例: b4122050 (8文字=年度1桁) / b25122050 (9文字=年度2桁)。
 * 構造: [英字][年度][区分1桁][課程2桁][個人番号3桁]。区分1=学部のみ対象、個人番号800番台=Tech。
 * (詳細はメモリ kitmate-username-format 参照)
 */
export function parseUsernameProfile(username: string): ParsedProfile | null {
  const m = username.match(/^[A-Za-z]*(\d+)$/);
  if (m === null) return null;
  const digits = m[1];

  let admissionYear: number;
  let rest: string;
  if (digits.length === 7) {
    admissionYear = 2020 + Number(digits[0]); // 年度1桁 (3=2023, 4=2024…)
    rest = digits.slice(1);
  } else if (digits.length === 8) {
    admissionYear = 2000 + Number(digits.slice(0, 2)); // 年度2桁 (25=2025…)
    rest = digits.slice(2);
  } else {
    return null;
  }

  // rest = 区分(1) + 課程(2) + 個人番号(3)
  if (rest[0] !== '1') return null; // 学部以外(博士前期6/後期8)は課程マップ対象外
  const program = COURSE_TO_PROGRAM[rest.slice(1, 3)];
  if (program === undefined) return null;
  const personal = Number(rest.slice(3, 6));
  const tech = personal >= 800 && personal <= 899; // 800番台 = Tech プログラム

  return { admissionYear, program, tech };
}

/** ログイン時: username から判定したプロフィールを設定に反映する (判別不能なら何もしない)。 */
export function applyProfileFromUsername(username: string): void {
  const parsed = parseUsernameProfile(username);
  if (parsed === null) return;

  const settings = useSettings.getState();
  settings.set('admissionYear', parsed.admissionYear);

  // chem / design_arch のサブコースは学籍番号から判別できないため、既存値を引き継ぎ無ければ既定
  const existing = settings.programSelection;
  const sel: ProgramSelection = { program: parsed.program, tech: parsed.tech };
  if (parsed.program === 'chem') {
    sel.chemCourse = (existing?.program === 'chem' ? existing.chemCourse : undefined) ?? 'A';
  } else if (parsed.program === 'design_arch') {
    sel.daCourse = (existing?.program === 'design_arch' ? existing.daCourse : undefined) ?? 'design';
  }
  settings.set('programSelection', sel);
}
