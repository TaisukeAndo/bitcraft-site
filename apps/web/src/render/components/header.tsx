export function Header() {
  return (
    <header>
      <a class="header-logo" href="/">
        <img src="/image/bitcraft-logo.png" alt="bitcraft-logo" />
      </a>
      <div class="header-right">
        <input type="checkbox" class="menu-btn" id="menu-btn" />
        <label for="menu-btn" class="menu-icon">
          <span class="navicon"></span>
        </label>
        <ul class="menu">
          <li>
            <a class="menu-item" href="/">
              Home
            </a>
          </li>
          <li>
            <a class="menu-item" href="/#service">
              Service
            </a>
          </li>
          <li>
            <a class="menu-item" href="/#idea">
              Idea
            </a>
          </li>
          <li>
            <a class="menu-item" href="/#news">
              News
            </a>
          </li>
          <li class="right">
            <a class="contact-button" href="/contact">
              <i class="fa-solid fa-envelope"></i>
              <p>Contact</p>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
