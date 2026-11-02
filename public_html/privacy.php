<?php
// Privacy Policy (served at /privacy-policy). Plain words, Leah's voice, with the Google sign-in section Google asks for.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/legal.php';

page_header('Privacy Policy', 'legal');
?>
<h1>Privacy Policy</h1>
<p class="hint">Last updated <?= e(LEGAL_UPDATED) ?></p>
<p class="lede">The short version: I collect as little as I can, I keep it safe, I never sell it, and you can delete your account any time. The longer version is below, in normal human words.</p>

<h2>Who runs this site</h2>
<p>Lived by Leah (livedbyleah.com) is my vlog hub and fan site. I make it with my family, who look after the technical stuff. Questions about your data? Reach us through <?= legal_contact() ?>.</p>

<h2>What I collect</h2>
<ul>
  <li><strong>If you just visit:</strong> nothing about you personally. Our web host keeps ordinary server logs (like your IP address and which page was opened) for security and fixing problems.</li>
  <li><strong>If you join the fan club:</strong> your first name, last name (or just the first letter), email address, the username you pick, and a password. Your password is scrambled (hashed) so nobody, including me, can read it.</li>
  <li><strong>If you use Google to sign up or log in:</strong> see the Google section below.</li>
  <li><strong>What you do on the site:</strong> your game scores, your ideas, comments and likes, and any screenshots you send to earn points.</li>
  <li><strong>A cookie:</strong> one small cookie that keeps you logged in and keeps forms safe. No ads cookies, no trackers, no analytics.</li>
</ul>

<h2>Google account sign-in (Continue with Google)</h2>
<p>You can sign up or log in with your Google account. Here is exactly what that means:</p>
<ul>
  <li><strong>What we receive from Google:</strong> your name, your email address (and whether Google has verified it), and your Google account ID. That is all. We ask only for the basic &ldquo;openid, email and profile&rdquo; permissions.</li>
  <li><strong>What we do NOT get:</strong> your Google password, your contacts, your Gmail, your Drive files, your calendar, or anything else in your Google account. We cannot post or change anything in your Google account.</li>
  <li><strong>Why we use it:</strong> only to create your fan club account, recognise you when you come back, and show your username. We do not use it for advertising or to build profiles, and we do not sell, rent or share it with anyone else.</li>
  <li><strong>Google rules:</strong> the use of information received from Google APIs follows the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including its Limited Use requirements.</li>
  <li><strong>Taking it back:</strong> you can remove this site&rsquo;s access any time in your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google Account permissions</a>. To delete the data we hold, delete your fan account (see &ldquo;Your choices&rdquo;).</li>
</ul>

<h2>What other people can see</h2>
<ul>
  <li>Your <strong>username</strong> (it is first name plus the first letter of your last name unless you change it), your scores and your approved comments and ideas are public.</li>
  <li>Your <strong>email and full name</strong> are only seen by me and the site admins. Never shown to other fans.</li>
  <li>Comments and ideas wait for my OK before other people see them.</li>
</ul>

<h2>Who we share data with</h2>
<p>Nobody for marketing, ever. A few services help the site work: our web hosting company (it stores the site and its database), Google (for sign-in if you choose it, and for videos), and your own email provider (when we send you a confirmation email). YouTube videos only load when you tap play, and video thumbnails come from YouTube&rsquo;s servers, so YouTube may see that your browser asked for them. Each of those companies has its own privacy policy.</p>

<h2>How long we keep things</h2>
<p>For as long as your account exists. If you delete your account, we delete your profile, scores, ideas, comments and screenshots. Ordinary server logs are cleared by our host on their normal schedule. Backups may hold older copies for a short time.</p>

<h2>Your choices</h2>
<ul>
  <li><strong>Delete your account</strong> yourself: Fan Fest &rarr; My account &rarr; Delete my account.</li>
  <li><strong>Ask to see, fix or delete your data</strong> by contacting us (<?= legal_contact() ?>). We will answer within 30 days.</li>
  <li>Depending on where you live (for example the EU or California), you may have extra rights such as access, correction, deletion and objection. We honor them for everyone.</li>
</ul>

<h2>Kids and teens</h2>
<p>The fan club is for people <strong>13 and older</strong>. If you are under 13, you can still watch the vlogs and play the games without an account, but please do not join. If we find out someone under 13 has joined, we delete the account. Parents: if you think that happened, tell us and we will remove it.</p>

<h2>Safety</h2>
<p>Passwords are hashed, forms are protected against forgery, and the site runs over HTTPS. No website can promise perfect security, but we take care of yours like it is ours.</p>

<h2>Changes</h2>
<p>If I change this page in a way that matters, I will update the date at the top and tell fan club members on the site.</p>
<?= legal_footer_links() ?>
<?php page_footer(); ?>
