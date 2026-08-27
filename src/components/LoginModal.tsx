import { Check, Eye, EyeOff, LoaderCircle, LockKeyhole, MessageSquareText, Phone, ShieldCheck, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../data/api";

export interface SessionUser { id?: string; phone: string; displayName: string; hasPassword?: boolean; createdAt?: string; }
interface LoginModalProps { open: boolean; onClose: () => void; onSuccess: (user: SessionUser) => void; }

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"sms" | "password">("sms");
  const [phone, setPhone] = useState("");
  const [credential, setCredential] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown, open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);
  if (!open) return null;

  const validPhone = /^1\d{10}$/.test(phone);
  const sendCode = async () => {
    if (!validPhone) return setError("请输入正确的 11 位手机号");
    try { const result = await api.requestSms(phone); setError(result.devCode ? `开发验证码：${result.devCode}` : "验证码已发送"); setCountdown(60); }
    catch (error) { setError(error instanceof Error ? error.message : "验证码发送失败"); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validPhone) return setError("请输入正确的 11 位手机号");
    if (mode === "sms" && !/^\d{6}$/.test(credential)) return setError("请输入 6 位验证码");
    if (mode === "password" && credential.length < 8) return setError("密码至少需要 8 位");
    if (!agreed) return setError("请先阅读并同意服务协议与隐私政策");
    setError(""); setSubmitting(true);
    try { const user = mode === "sms" ? await api.loginSms(phone, credential) : await api.loginPassword(phone, credential); onSuccess(user); }
    catch (error) { setError(error instanceof Error ? error.message : "登录失败"); }
    finally { setSubmitting(false); }
  };

  return <div className="auth-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" type="button" aria-label="关闭登录" onClick={onClose}><X /></button>
      <div className="auth-brand"><span className="brand-mark">析</span><span>析线 AI<small>可信图表研究工具</small></span></div>
      <div className="auth-heading"><span>账户登录</span><h2 id="auth-title">同步你的分析与复盘</h2><p>登录后可保存扫描记录、关注标的与条件提醒</p></div>
      <div className="auth-tabs" role="tablist"><button type="button" className={mode === "sms" ? "active" : ""} onClick={() => { setMode("sms"); setCredential(""); setError(""); }}>验证码登录</button><button type="button" className={mode === "password" ? "active" : ""} onClick={() => { setMode("password"); setCredential(""); setError(""); }}>密码登录</button></div>
      <form className="auth-form" onSubmit={submit}>
        <label><span>手机号</span><div className="auth-field"><Phone /><input autoFocus inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></div></label>
        <label><span>{mode === "sms" ? "验证码" : "密码"}</span><div className="auth-field">{mode === "sms" ? <MessageSquareText /> : <LockKeyhole />}<input type={mode === "password" && !showPassword ? "password" : "text"} inputMode={mode === "sms" ? "numeric" : undefined} maxLength={mode === "sms" ? 6 : 32} placeholder={mode === "sms" ? "输入 6 位验证码" : "输入登录密码"} value={credential} onChange={(event) => setCredential(mode === "sms" ? event.target.value.replace(/\D/g, "") : event.target.value)} />{mode === "sms" ? <button className="send-code" type="button" disabled={countdown > 0} onClick={sendCode}>{countdown > 0 ? `${countdown}s` : "获取验证码"}</button> : <button className="password-toggle" type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button>}</div></label>
        <button className={`agreement ${agreed ? "checked" : ""}`} type="button" onClick={() => setAgreed(!agreed)}><span>{agreed && <Check />}</span><b>我已阅读并同意《服务协议》和《隐私政策》</b></button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" /> : <ShieldCheck />}{submitting ? "正在登录" : "安全登录"}</button>
      </form>
      <p className="auth-demo">已连接本地账户服务；开发环境验证码会直接显示，生产环境需配置短信供应商。</p>
    </section>
  </div>;
}
