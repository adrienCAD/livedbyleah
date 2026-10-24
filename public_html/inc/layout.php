<?php
// Page chrome: left sidebar with the four tabs, mobile menu button, footer.
declare(strict_types=1);

function page_header(string $title, string $active, string $extraHead = ''): void {
    $tabs = [
        'writing' => ['/index.php', 'Writing Process'],
        'vlogs'   => ['/vlogs.php', 'Watch Vlogs'],
        'fans'    => ['/fans.php', 'Fans'],
        'creative' => ['/creative.php', 'Creative'],
    ];
    ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?> | <?= e(SITE_NAME) ?></title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23FDC921'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&family=Press+Start+2P&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
<?= $extraHead ?>
</head>
<body>
<button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="sidebar">Menu</button>
<div class="shell">
  <nav class="sidebar" id="sidebar" aria-label="Main">
    <a class="brand" href="/index.php"><span class="brand-top">Lived by</span><span class="brand-name">Leah</span></a>
    <ul>
      <?php foreach ($tabs as $key => [$href, $label]): ?>
        <li><a href="<?= e($href) ?>"<?= $key === $active ? ' class="active" aria-current="page"' : '' ?>><?= e($label) ?></a></li>
      <?php endforeach; ?>
    </ul>
    <?php if (is_admin()): ?>
      <a class="admin-link" href="/admin/index.php">Admin</a>
    <?php endif; ?>
  </nav>
  <main class="content">
<?php
}

function page_footer(string $extraScripts = ''): void {
    ?>
  </main>
</div>
<script src="/assets/js/site.js"></script>
<?= $extraScripts ?>
</body>
</html>
<?php
}

function admin_header(string $title): void {
    ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><?= e($title) ?> | Admin</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="admin">
<div class="admin-wrap">
  <header class="admin-bar">
    <strong>Lived by Leah admin</strong>
    <nav>
      <a href="/admin/index.php">Dashboard</a>
      <a href="/admin/vlogs.php">Vlogs</a>
      <a href="/admin/posts.php">Writing posts</a>
      <a href="/index.php">View site</a>
      <a href="/admin/logout.php">Log out</a>
    </nav>
  </header>
  <main class="admin-main">
<?php
    if ($m = flash()) {
        echo '<p class="notice">' . e($m) . '</p>';
    }
}

function admin_footer(): void {
    echo "  </main>\n</div>\n</body>\n</html>\n";
}
