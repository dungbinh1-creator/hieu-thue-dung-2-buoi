// Tìm trong kho tri thức (quy định đã tóm tắt và trả lời của cơ quan thuế trên Cổng hỏi đáp Bộ Tài chính)
// các mục liên quan tới câu hỏi của khách. Thuật toán BM25 trên âm tiết và cụm hai âm tiết, bỏ dấu tiếng Việt.
import KB from "./kb-data.js";

const STOP = new Set(
  "la cua va co cho thi ma de duoc khong hay hoac nhu nao gi the nay do khi neu toi minh ban em anh chi xin hoi cam on vui long kinh gui ve voi tu den trong tren duoi mot cac nhung da dang se can phai bi boi vi nen".split(" ")
);

export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
}

function terms(s) {
  const w = norm(s).split(" ").filter((t) => t && !STOP.has(t));
  const out = [...w];
  for (let i = 0; i + 1 < w.length; i++) out.push(w[i] + "_" + w[i + 1]); // cụm hai âm tiết, ví dụ "hoa_don", "ho_kinh"
  return out;
}

// Chỉ số dựng một lần khi Worker khởi động.
const docs = KB.map((d) => {
  const tf = new Map();
  const text = [d.q, d.q, d.k, d.t, d.a].join(" "); // câu hỏi và từ khoá được nhân trọng số
  for (const t of terms(text)) tf.set(t, (tf.get(t) || 0) + 1);
  let len = 0;
  for (const v of tf.values()) len += v;
  return { d, tf, len };
});
const N = docs.length || 1;
const avgLen = docs.reduce((s, x) => s + x.len, 0) / N || 1;
const df = new Map();
for (const x of docs) for (const t of x.tf.keys()) df.set(t, (df.get(t) || 0) + 1);

export function searchKB(query, limit = 3, minScore = 6) {
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const k1 = 1.4, b = 0.75;
  const scored = [];
  for (const x of docs) {
    let s = 0;
    for (const t of q) {
      const f = x.tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      const w = t.includes("_") ? 1.6 : 1; // cụm hai âm tiết khớp thì tăng điểm
      s += w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * x.len) / avgLen)));
    }
    if (s < minScore) continue;
    // Ưu tiên: quy định mới > hỏi đáp năm 2026 > mục cũ hơn. Mục có căn cứ cũ (x) xếp sau cùng.
    const rank = x.d.x ? 0.8 : x.d.y === "qd" ? 1.25 : /2026$/.test(x.d.n || x.d.h || "") ? 1.1 : 1;
    scored.push({ s: s * rank, d: x.d });
  }
  scored.sort((a, b2) => b2.s - a.s);
  return scored.slice(0, limit);
}

// Đoạn tài liệu chèn vào prompt hệ thống.
export function kbContext(hits) {
  if (!hits.length) return "";
  const parts = hits.map(({ d }, i) =>
    d.y === "qd"
      ? [
          `[${i + 1}] Loại: QUY ĐỊNH. Chủ đề: ${d.t}.${d.e ? ` Hiệu lực từ ${d.e}.` : ""}`,
          `Nội dung: ${d.q} ${d.a}`,
          d.v && d.v.length ? `Căn cứ: ${d.v.join("; ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `[${i + 1}] Loại: HỎI ĐÁP. Chủ đề: ${d.t}. Cơ quan trả lời: ${d.c || "cơ quan thuế"}${d.n ? `, ngày ${d.n}` : d.h ? `, câu hỏi gửi ngày ${d.h}` : ""}.`,
          `Hỏi: ${d.q}`,
          `Trả lời: ${d.a}`,
          d.v && d.v.length ? `Căn cứ: ${d.v.join("; ")}` : "",
          d.l ? `Nguồn: ${d.l}` : "",
        ]
          .filter(Boolean)
          .join("\n")
  );
  return `

# TÀI LIỆU THAM KHẢO CHO CÂU HỎI NÀY
Loại QUY ĐỊNH là quy định pháp luật đã tóm tắt. Loại HỎI ĐÁP là trả lời của cơ quan thuế trên Cổng hỏi đáp chính sách của Bộ Tài chính, viết cho trường hợp cụ thể của người hỏi khác.
Cách dùng:
1. Nếu tài liệu liên quan trực tiếp, trả lời bám theo tài liệu, giữ đúng con số, và ưu tiên loại QUY ĐỊNH.
2. Với loại QUY ĐỊNH, ghi ở cuối: "Căn cứ: [điều, văn bản], hiệu lực từ [ngày]". Thiếu ngày hiệu lực thì chỉ ghi căn cứ. Không nhắc tới tài liệu nội bộ hay người soạn.
3. Với loại HỎI ĐÁP, ghi ở cuối: "Tham khảo trả lời của [cơ quan] ngày [ngày]: [link]", và nói rõ đây là hướng dẫn cho một trường hợp cụ thể, người dùng nên đối chiếu với tình huống của mình.
4. Nếu mục HỎI ĐÁP có ngày trước năm 2026 và liên quan tới hộ kinh doanh, thuế khoán hoặc thương mại điện tử, nhắc rằng quy định có thể đã thay đổi từ năm 2026.
5. Nếu các mục nêu con số khác nhau, không tự chọn một con số: nói rõ quy định đã thay đổi qua các văn bản, nêu mức theo văn bản mới nhất có trong tài liệu kèm căn cứ, và gợi ý đối chiếu văn bản hiện hành.
6. Nếu tài liệu không liên quan tới câu hỏi thì bỏ qua, không nhắc tới.

${parts.join("\n\n")}`;
}
