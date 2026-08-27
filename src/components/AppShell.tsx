import {
  Bell,
  Bookmark,
  Camera,
  CandlestickChart,
  CircleUserRound,
  History,
  Home,
  LayoutGrid,
  LogOut,
  ScanLine,
  Search,
} from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import type { AppPage } from "../types";
import { Logo } from "./Logo";
import type { SessionUser } from "./LoginModal";

interface AppShellProps extends PropsWithChildren {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  user: SessionUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

const navItems: Array<{
  page?: AppPage;
  label: string;
  icon: typeof ScanLine;
}> = [
  { page: "capture", label: "拍照分析", icon: ScanLine },
  { page: "analysis", label: "研究报告", icon: CandlestickChart },
  { page: "replay", label: "分析复盘", icon: History },
  { page: "watchlist", label: "我的自选", icon: Bookmark },
  { page: "alerts", label: "条件提醒", icon: Bell },
];

export function AppShell({ page, onNavigate, user, onOpenLogin, onLogout, children }: AppShellProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountAction = () => onNavigate("profile");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.page === page || (page === "confirm" && item.page === "capture");
            return (
              <button
                className={active ? "active" : ""}
                key={item.label}
                onClick={() => item.page && onNavigate(item.page)}
                type="button"
              >
                <Icon aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <strong>数据按需核验</strong>
          <span>行情与公告显示实际获取时间</span>
          <span>分析结论保留数据来源</span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-logo"><Logo compact /></div>
          <div className="topbar-message">AI 图表研究</div>
          <div className="service-status"><span />行情服务正常</div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="搜索">
              <Search aria-hidden="true" />
            </button>
            <div className="account-area">
              <button className={`icon-button account-button ${user ? "signed-in" : ""}`} type="button" aria-label={user ? "账户菜单" : "登录"} onClick={accountAction}>
                {user ? user.displayName.slice(-2) : <CircleUserRound aria-hidden="true" />}
              </button>
              {user && accountOpen && <div className="account-menu"><strong>{user.displayName}</strong><span>{user.phone.slice(0, 3)}****{user.phone.slice(-4)}</span><button type="button" onClick={() => { onLogout(); setAccountOpen(false); }}><LogOut />退出登录</button></div>}
            </div>
            <button
              className="button button-accent"
              type="button"
              onClick={() => onNavigate("capture")}
            >
              <Camera aria-hidden="true" />拍 K 线
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="移动端导航">
        <button
          className={page === "capture" || page === "confirm" ? "active" : ""}
          onClick={() => onNavigate("capture")}
          type="button"
        >
          <Home aria-hidden="true" />主页
        </button>
        <button
          className={page === "analysis" ? "active" : ""}
          onClick={() => onNavigate("analysis")}
          type="button"
        >
          <LayoutGrid aria-hidden="true" />分析
        </button>
        <button
          className="camera-action"
          onClick={() => onNavigate("capture")}
          type="button"
          aria-label="拍照"
        >
          <Camera aria-hidden="true" />
        </button>
        <button
          className={page === "replay" ? "active" : ""}
          onClick={() => onNavigate("replay")}
          type="button"
        >
          <History aria-hidden="true" />复盘
        </button>
        <button type="button" className={page === "profile" ? "active" : ""} onClick={accountAction}>
          <CircleUserRound aria-hidden="true" />我的
        </button>
      </nav>
    </div>
  );
}
