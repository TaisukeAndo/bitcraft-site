export function Footer() {
  return (
    <footer>
      <div class="footer-menu content">
        <div class="image">
          <a href="/">
            <img src="/image/bitcraft-logo-white.png" alt="bitcraft-logo" />
          </a>
        </div>
        <div class="list">
          <h2>Site map</h2>
          <ul>
            <li>
              <a href="/">- Home</a>
            </li>
            <li>
              <a href="/#service">- Service</a>
            </li>
            <li>
              <a href="/#idea">- Idea</a>
            </li>
            <li>
              <a href="/#news">- News</a>
            </li>
            <li>
              <a href="/#about">- About</a>
            </li>
            <li>
              <a href="/contact">- Contact</a>
            </li>
          </ul>
        </div>
        <div class="list">
          <h2>Social</h2>
          <ul>
            <li>
              <a class="social-item" href="https://www.instagram.com/ta.__.ch/" target="_blank">
                <i class="fa-brands fa-instagram"></i>
                <p>Instagram</p>
              </a>
            </li>
            <li>
              <a
                class="social-item"
                href="https://www.facebook.com/profile.php?id=100053394909552"
                target="_blank"
              >
                <i class="fa-brands fa-square-facebook"></i>
                <p>Facebook</p>
              </a>
            </li>
            <li>
              <a class="social-item" href="https://x.com/kuma_progr" target="_blank">
                <i class="fa-brands fa-square-x-twitter"></i>
                <p>X (旧Twitter)</p>
              </a>
            </li>
          </ul>
        </div>
        <div class="list">
          <h2>Blog</h2>
          <ul>
            <li>
              <a href="https://qiita.com/TaisukeAndo" target="_blank">
                - Qiita
              </a>
            </li>
            <li>
              <a href="https://github.com/TaisukeAndo" target="_blank">
                - Github
              </a>
            </li>
            <li>
              <a href="https://note.com/a_taisuke" target="_blank">
                - note
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div class="content policy">
        <a href="/policy/">プライバシーポリシー</a>
      </div>
      <div class="content">
        <small>© 2025 bitcraft All Rights Reserved</small>
      </div>
    </footer>
  );
}
