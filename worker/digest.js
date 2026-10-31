// Đường xử lý nội bộ POST /admin/digest: đọc ảnh công văn trả lời của cơ quan thuế và tóm tắt
// thành một mục kho tri thức cho chatbot. Chỉ dùng khi dựng/cập nhật kho, bảo vệ bằng secret ADMIN_TOKEN.

const DIGEST_MODEL = "gemini-3-8-flash-openai";

const DIGEST_PROMPT = `Bạn là chuyên viên biên tập kiến thức thuế Việt Nam. Đầu vào gồm câu hỏi người dân hoặc doanh nghiệp gửi Bộ Tài chính và ảnh công văn trả lời của cơ quan thuế.
Chỉ trả về MỘT đối tượng JSON hợp lệ, không thêm chữ nào khác, theo mẫu:
{
 "huu_ich": true hoặc false,
 "chu_de": "một trong: Hộ kinh doanh, Thương mại điện tử, Hoá đơn, Thuế GTGT, Thuế TNCN, Thuế TNDN, Đăng ký thuế, Quyết toán, Hoàn thuế, Cho thuê tài sản, Khác",
 "doi_tuong": "một trong: hộ kinh doanh, cá nhân, doanh nghiệp, chung",
 "cau_hoi": "câu hỏi rút gọn, tổng quát hoá, tối đa 40 từ",
 "tra_loi": "tóm tắt nội dung hướng dẫn, tối đa 120 từ",
 "can_cu": ["số hiệu và tên ngắn của văn bản pháp luật được dẫn chiếu"],
 "ngay_tra_loi": "dd/mm/yyyy hoặc chuỗi rỗng",
 "co_quan": "tên cơ quan trả lời hoặc chuỗi rỗng",
 "tu_khoa": ["5 đến 10 từ khoá tìm kiếm tiếng Việt"]
}
Quy tắc:
1. "huu_ich" là false nếu ảnh không đọc được, hoặc câu trả lời chỉ dẫn chiếu văn bản khác hay chuyển nơi khác mà không nêu nội dung hướng dẫn cụ thể.
2. Không đưa tên người, tên công ty, mã số thuế, số điện thoại, email, địa chỉ, số công văn trả lời riêng cho một đơn vị vào "cau_hoi" và "tra_loi".
3. Giữ nguyên số liệu, tỷ lệ, ngưỡng, thời hạn, điều khoản đúng như công văn. Không suy diễn, không thêm kiến thức ngoài công văn.
4. "can_cu" chỉ gồm luật, nghị định, thông tư, nghị quyết, quyết định được viện dẫn; không gồm công văn trả lời riêng.
5. Viết tiếng Việt có dấu, câu ngắn, dễ hiểu.`;

const RULES_PROMPT = `Bạn là chuyên viên biên tập kiến thức thuế Việt Nam. Đầu vào là chữ trích từ slide giảng về quy định thuế năm 2025-2026, có thể lộn xộn, trùng lặp và nhiều chữ viết tắt.
Nhiệm vụ: rút ra các quy định thực sự có ích khi trả lời câu hỏi của người dân và doanh nghiệp, rồi viết lại bằng lời của bạn.
Chỉ trả về MỘT mảng JSON hợp lệ, không thêm chữ nào khác. Không có quy định nào đáng rút thì trả về []. Mỗi phần tử theo mẫu:
{
 "chu_de": "một trong: Hộ kinh doanh, Thương mại điện tử, Hoá đơn, Thuế GTGT, Thuế TNCN, Thuế TNDN, Đăng ký thuế, Quản lý thuế, Quyết toán, Hoàn thuế, Cho thuê tài sản, Giao dịch liên kết, Nhà thầu nước ngoài, Tài chính ngân hàng, Khác",
 "doi_tuong": "một trong: hộ kinh doanh, cá nhân, doanh nghiệp, chung",
 "cau_hoi": "câu hỏi tự nhiên mà người dùng sẽ hỏi về quy định này, tối đa 30 từ",
 "tra_loi": "giải thích dễ hiểu, tối đa 100 từ",
 "can_cu": ["điều, khoản và số hiệu văn bản, ví dụ: Điều 5 Nghị định 181/2025/NĐ-CP"],
 "hieu_luc": "ngày hiệu lực dd/mm/yyyy nếu slide nêu rõ, nếu không thì chuỗi rỗng",
 "co_so_lieu": true nếu "tra_loi" có ngưỡng, tỷ lệ, mức tiền hoặc thời hạn, ngược lại false,
 "can_kiem_tra": "ghi ngắn điểm chữ slide mờ, mâu thuẫn hoặc có vẻ gõ sai; không có thì chuỗi rỗng",
 "tu_khoa": ["5 đến 10 từ khoá tìm kiếm tiếng Việt"]
}
Quy tắc:
1. Không chép nguyên câu từ slide. Diễn đạt lại bằng câu ngắn, viết đầy đủ các chữ viết tắt (HKD là hộ kinh doanh, NNT là người nộp thuế, HĐĐT là hoá đơn điện tử).
2. Giữ đúng tuyệt đối mọi số liệu, tỷ lệ, ngưỡng, thời hạn, số điều khoản và số hiệu văn bản có trong slide. Không suy diễn, không thêm kiến thức ngoài slide, không đoán ngày hiệu lực hay căn cứ.
3. Nếu slide không nêu văn bản căn cứ cho một quy định thì để "can_cu" rỗng; không tự gán.
4. Bỏ qua: tên giảng viên, tên người, tên công ty, mã số thuế, đường dẫn tệp, ví dụ cá nhân, công văn trả lời riêng cho một đơn vị, mục lục, lời chào, câu hỏi thảo luận.
5. Mỗi phần tử chỉ nói một quy định. Mỗi đầu vào rút tối đa 12 phần tử, ưu tiên điều người dùng hay hỏi.
6. Viết tiếng Việt có dấu.`;

const REWRITE_PROMPT = `Bạn là chuyên viên biên tập kiến thức thuế Việt Nam. Đầu vào là mảng JSON các mục {"id", "cau_hoi", "tra_loi"}. Viết lại "tra_loi" của từng mục bằng cách diễn đạt và cấu trúc câu khác hẳn, ngắn gọn, dễ hiểu cho người không có nền tảng kế toán.
Chỉ trả về MỘT mảng JSON hợp lệ dạng [{"id": "...", "tra_loi": "..."}], đủ mọi id, không thêm chữ nào khác.
Quy tắc: giữ nguyên ý và giữ đúng tuyệt đối mọi con số, tỷ lệ, ngày tháng, số điều khoản, số hiệu văn bản; không thêm kiến thức mới; tối đa 100 từ mỗi mục; viết tiếng Việt có dấu.`;

// Đường xử lý nội bộ POST /admin/rules: rút quy định từ chữ slide thành các mục kho tri thức, viết lại bằng lời mới.
export async function handleRules(request, env) {
  if (!env.ADMIN_TOKEN || request.headers.get("x-admin-token") !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
  }
  const { text, rewrite } = await request.json();
  if (typeof text !== "string" || !text.trim()) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const res = await fetch(`https://api.kie.ai/${DIGEST_MODEL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.KIE_API_KEY}` },
    body: JSON.stringify({
      messages: [
        { role: "system", content: rewrite ? REWRITE_PROMPT : RULES_PROMPT },
        { role: "user", content: (rewrite ? "CÁC MỤC CẦN VIẾT LẠI:\n" : "CHỮ TRÍCH TỪ SLIDE:\n") + text.slice(0, 12000) },
      ],
      stream: false,
      include_thoughts: false,
      reasoning_effort: "low",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.code && data.code !== 200) {
    return new Response(JSON.stringify({ error: "kie", code: data.code, msg: data.msg }), { status: 502, headers: { "content-type": "application/json" } });
  }
  const out = data?.choices?.[0]?.message?.content || "";
  return new Response(JSON.stringify({ text: out, credits: data.credits_consumed ?? null }), { headers: { "content-type": "application/json" } });
}

export async function handleDigest(request, env) {
  if (!env.ADMIN_TOKEN || request.headers.get("x-admin-token") !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
  }
  const { question, image_urls = [], answer_text = "" } = await request.json();
  if (typeof question !== "string" || !Array.isArray(image_urls) || (!image_urls.length && !answer_text)) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const content = [{ type: "text", text: "CÂU HỎI:\n" + question.slice(0, 6000) + (answer_text ? "\n\nCÔNG VĂN TRẢ LỜI (dạng chữ):\n" + String(answer_text).slice(0, 8000) : "") + (image_urls.length ? "\n\nẢNH CÔNG VĂN TRẢ LỜI ở bên dưới." : "") }].concat(
    image_urls.slice(0, 6).map((url) => ({ type: "image_url", image_url: { url } }))
  );
  const res = await fetch(`https://api.kie.ai/${DIGEST_MODEL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.KIE_API_KEY}` },
    body: JSON.stringify({
      messages: [{ role: "system", content: DIGEST_PROMPT }, { role: "user", content }],
      stream: false,
      include_thoughts: false,
      reasoning_effort: "low",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.code && data.code !== 200) {
    return new Response(JSON.stringify({ error: "kie", code: data.code, msg: data.msg }), { status: 502, headers: { "content-type": "application/json" } });
  }
  const text = data?.choices?.[0]?.message?.content || "";
  return new Response(JSON.stringify({ text, credits: data.credits_consumed ?? null }), { headers: { "content-type": "application/json" } });
}
