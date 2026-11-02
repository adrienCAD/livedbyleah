<?php
// Terms of Use (served at /terms). Plain words, Leah's voice, with the Google sign-in section.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/legal.php';

page_header('Terms of Use', 'legal');
?>
<h1>Terms of Use</h1>
<p class="hint">Last updated <?= e(LEGAL_UPDATED) ?></p>
<p class="lede">These are the house rules for Lived by Leah. By using the site you agree to them. They are short because the main rule is: <strong>be kind and have fun.</strong></p>

<h2>Using the site</h2>
<ul>
  <li>Watching vlogs and playing games is open to everyone.</li>
  <li>The fan club is for people <strong>13 and older</strong>. Not 13 yet? Come back on your birthday!</li>
  <li>If you are under 18, please make sure a parent or guardian is okay with you using the site.</li>
</ul>

<h2>Your account</h2>
<ul>
  <li>Give real, honest info when you sign up, and keep your password to yourself. You are responsible for what happens with your account.</li>
  <li>One person, one account please.</li>
  <li>You can delete your account whenever you like (Fan Fest &rarr; My account).</li>
</ul>

<h2>Signing in with Google</h2>
<p>If you choose &ldquo;Continue with Google&rdquo;, you let Google tell us your name, email address and Google account ID so we can create or find your fan account. Using it is optional and you can always sign up with an email and password instead. Google sign-in is provided by Google, and your use of your Google account stays under Google&rsquo;s own terms. We do not get your Google password or any other data from your account. See our <a href="/privacy-policy">Privacy Policy</a> for the details, and remove our access any time in your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google Account permissions</a>.</p>

<h2>Be kind (the rules of the comments)</h2>
<p>Comments, ideas and screenshots must not include:</p>
<ul>
  <li>bullying, hate, or mean stuff about anyone</li>
  <li>personal information (yours or anyone else&rsquo;s), like addresses, phone numbers or school names</li>
  <li>links, ads, spam, or anything illegal or not safe for teens</li>
</ul>
<p>I read comments and ideas before they go live, and I can hide or delete anything, pause an account, or remove it, especially if the rules above are broken. Cheating at the games (like faking scores) can get your scores removed.</p>

<h2>What you post</h2>
<p>You own what you write. By posting a comment or idea, you let me show it on the site. If I use your idea, great, but I do not owe you anything beyond the fan points I promised. Please only send screenshots and text that are yours to share.</p>

<h2>My stuff</h2>
<p>The videos, art, pixel drawings, characters, games and writing on this site are made by Leah and her family. Please do not copy or re-post them as your own. Sharing a link to the site is always welcome. Fan points and rankings are just for fun: they have no cash value and I can adjust them if something looks off.</p>

<h2>No guarantees</h2>
<p>This is a fun hobby project, offered as it is. Sometimes things break, scores reset or the site goes down for maintenance. I try my best but cannot promise it will always work. To the extent the law allows, the site&rsquo;s owners are not responsible for losses from using it.</p>

<h2>Changes</h2>
<p>I may update these terms as the site grows. If something important changes, I will update the date above. Questions? Reach us through <?= legal_contact() ?>.</p>
<?= legal_footer_links() ?>
<?php page_footer(); ?>
