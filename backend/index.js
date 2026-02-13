import express from "express";
import "dotenv/config";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ===============================
// PostgreSQL接続設定
// ===============================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// ===============================
// DB接続テスト
// ===============================
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "success",
      time: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "DB接続失敗",
    });
  }
});

// ===============================
// 初回登録API
// ===============================
app.post("/register", async (req, res) => {
  const { company_id, company_name, email, password } = req.body;

  if (!company_id || !company_name || !email || !password) {
    return res.status(400).json({ message: "必須項目が不足しています" });
  }

  try {
    // ① 会社確認
    const companyResult = await pool.query(
      "SELECT * FROM companies WHERE company_id = $1",
      [company_id]
    );

    // ② なければ会社作成
    if (companyResult.rows.length === 0) {
      await pool.query(
        "INSERT INTO companies (company_id, name) VALUES ($1, $2)",
        [company_id, company_name]
      );
    }

    // ③ その会社のユーザー数確認
    const userCountResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE company_id = $1",
      [company_id]
    );

    const userCount = parseInt(userCountResult.rows[0].count, 10);

    // ④ role決定
    const role = userCount === 0 ? "admin" : "staff";

    // ⑤ status決定
    const status = role === "admin" ? "active" : "pending";

    // ⑥ パスワードハッシュ
    const hashedPassword = await bcrypt.hash(password, 10);

    // ⑦ ユーザー作成
    await pool.query(
      `INSERT INTO users (company_id, email, password, role, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [company_id, email, hashedPassword, role, status]
    );

    res.json({
      message: "登録完了",
      role,
      status,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "登録に失敗しました" });
  }
});

// ===============================
// 承認待ちユーザー一覧
// ===============================
app.get("/users/pending/:company_id", async (req, res) => {
  const { company_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, email, role, status FROM users WHERE company_id=$1 AND status='pending'",
      [company_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "取得失敗" });
  }
});

// ===============================
// ユーザー承認
// ===============================
app.post("/users/:id/approve", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE users SET status='active' WHERE id=$1 RETURNING id, email, role, status",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ユーザーが存在しません" });
    }

    res.json({
      message: "承認しました",
      user: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "承認失敗" });
  }
});

// ===============================
// サーバー確認
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "SaaS backend is running" });
});

// ===============================
// ===============================
// 簡易UI: 承認待ち一覧（ブラウザ）
// ===============================
app.get("/ui/pending", async (req, res) => {
  const company_id = req.query.company_id;
  if (!company_id) {
    return res.send(`<h3>company_id を付けてアクセスしてね</h3>
      <p>例: /ui/pending?company_id=company001</p>`);
  }

  const result = await pool.query(
    "SELECT id, email, role, status FROM users WHERE company_id=$1 AND status='pending' ORDER BY id",
    [company_id]
  );

  const rows = result.rows
    .map(
      (u) => `
      <tr>
        <td>${u.id}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.status}</td>
        <td>
          <form method="POST" action="/ui/approve">
            <input type="hidden" name="user_id" value="${u.id}" />
            <input type="hidden" name="company_id" value="${company_id}" />
            <button type="submit">承認</button>
          </form>
        </td>
      </tr>
    `
    )
    .join("");

  res.send(`
    <h2>承認待ち一覧（${company_id}）</h2>
    <p><a href="/">/</a> | <a href="/db-test">db-test</a></p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr><th>ID</th><th>Email</th><th>Role</th><th>Status</th><th>操作</th></tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">承認待ちはありません</td></tr>`}
      </tbody>
    </table>
  `);
});

// ===============================
// 簡易UI: 承認ボタン押下（POST）
// ===============================
app.post("/ui/approve", async (req, res) => {
  const { user_id, company_id } = req.body;
  if (!user_id || !company_id) return res.status(400).send("bad request");

  await pool.query("UPDATE users SET status='active' WHERE id=$1", [user_id]);
  res.redirect(`/ui/pending?company_id=${encodeURIComponent(company_id)}`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

