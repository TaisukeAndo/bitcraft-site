// js/script.js のスムーズスクロールは `a[href^=#]`（フラグメントのみのhref）
// だけを対象にする。トップページ自身をレンダリングする時はフラグメントのみの
// hrefを使い、それ以外のページでは "/"+フラグメントの絶対パスを使う
// （サブページから戻る際に正しくトップページへ遷移できるようにするため）。
export function Header({ isHome = false }: { isHome?: boolean } = {}) {
  const home = isHome ? "#" : "/";
  const service = isHome ? "#service" : "/#service";
  const idea = isHome ? "#idea" : "/#idea";
  const news = isHome ? "#news" : "/#news";

  return (
    <header>
      <a class="header-logo" href={home}>
        <img src="/image/bitcraft-logo.png" alt="bitcraft-logo" />
      </a>
      <div class="header-right">
        <input type="checkbox" class="menu-btn" id="menu-btn" />
        <label for="menu-btn" class="menu-icon">
          <span class="navicon"></span>
        </label>
        <ul class="menu">
          <li>
            <a class="menu-item" href={home}>
              Home
            </a>
          </li>
          <li>
            <a class="menu-item" href={service}>
              Service
            </a>
          </li>
          <li>
            <a class="menu-item" href={idea}>
              Idea
            </a>
          </li>
          <li>
            <a class="menu-item" href={news}>
              News
            </a>
          </li>
          <li class="right">
            <a class="contact-button" href="/contact/">
              <i class="fa-solid fa-envelope"></i>
              <p>Contact</p>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
