import { useEffect, useState } from "react";

export default function App() {
  const [companyId, setCompanyId] = useState("company001");
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://127.0.0.1:3000";

  const fetchPending = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/users/pending/${companyId}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      setMsg("❌ backend(3000)に接続できません。backendが起動してるか確認してね。");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    setMsg("");
    try {
      await fetch(`${API_BASE}/users/${id}/approve`, { method: "POST" });
      setMsg(`✅ 承認しました (id=${id})`);
      fetchPending();
    } catch (e) {
      setMsg("❌ 承認に失敗しました。backendが起動してるか確認してね。");
    }
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1>承認待ち一覧（React）</h1>
      <p style={{ color: "#555" }}>
        API: <code>{API_BASE}</code>
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label>
          company_id：
          <input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            style={{ marginLeft: 8, padding: 6 }}
          />
        </label>
        <button onClick={fetchPending} style={{ padding: "6px 12px" }}>
          取得
        </button>
        {loading && <span>読み込み中...</span>}
      </div>

      {msg && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {users.length === 0 ? (
        <div style={{ padding: 16, border: "1px dashed #ccc", borderRadius: 8 }}>
          承認待ちはありません
        </div>
      ) : (
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td>
                  <button onClick={() => approve(u.id)} style={{ padding: "6px 12px" }}>
                    承認
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
