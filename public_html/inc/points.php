<?php
// Game points (v1.8.0). Every game ranks by `pts`. A great full run lands around 15,000 to 35,000 in each game,
// so Surf, Outrun and Fossil Smash are comparable. The server works the points out from the stats a run reports
// (capped, so a bad request cannot invent a huge score). Returns [total, breakdown] where breakdown = [[label, points], ...].
declare(strict_types=1);

const SURF_LEVEL_PTS = 2000;     // per level cleared (5 levels)
const SURF_WIN_PTS = 3000;
const ROAD_KM_RATE = 1.5;        // points per km driven
const ROAD_COUNTRY_PTS = 1000;   // per new country reached
const ROAD_PARIS_PTS = 4000;

function pts_line(array &$rows, string $label, int $pts): void {
    if ($pts !== 0) { $rows[] = [$label, $pts]; }
}

// Surf Cleanup. in: sharks (jumped over), shot, ufo (UFOs shot down), lives (left at the end).
function surf_points(int $level, bool $won, int $ms, array $in): array {
    $rows = [];
    $cleared = $won ? 5 : max(0, $level - 1);
    pts_line($rows, 'Levels cleared (' . $cleared . ')', $cleared * SURF_LEVEL_PTS);
    if ($won) {
        pts_line($rows, 'Cleared all 5!', SURF_WIN_PTS);
        pts_line($rows, 'Speed bonus', (int)min(3000, max(0, 1200 - intdiv($ms, 1000)) * 5));
    }
    $shot = max(0, min(80, (int)($in['shot'] ?? 0)));
    $dodged = max(0, min(80, (int)($in['dodged'] ?? 0)));
    $ufo = max(0, min(10, (int)($in['ufo'] ?? 0)));
    $lives = max(0, min(5, (int)($in['lives'] ?? 0)));
    pts_line($rows, 'Sharks zapped (' . $shot . ')', $shot * 90);
    pts_line($rows, 'Sharks jumped (' . $dodged . ')', $dodged * 50);
    pts_line($rows, 'UFOs shot down (' . $ufo . ')', $ufo * 500);
    pts_line($rows, 'Lives left (' . $lives . ')', $lives * 400);
    return [array_sum(array_column($rows, 1)), $rows];
}

// Leah's Outrun. $baseKm = km driven (0..7700). in: dodged, batt, slide (longest slide in tenths of a second), bumped.
function road_points(int $baseKm, int $level, bool $won, array $in): array {
    $rows = [];
    pts_line($rows, 'Distance (' . number_format($baseKm) . ' km)', (int)round($baseKm * ROAD_KM_RATE));
    pts_line($rows, 'New countries (' . max(0, $level - 1) . ')', max(0, $level - 1) * ROAD_COUNTRY_PTS);
    if ($won) { pts_line($rows, 'Reached Paris!', ROAD_PARIS_PTS); }
    // the caps grow with the distance driven, so a made-up request cannot claim a huge bonus on a short trip
    $dodged = max(0, min(60, 2 + intdiv($baseKm, 100), (int)($in['dodged'] ?? 0)));
    $batt = max(0, min(100, 2 + intdiv($baseKm, 60), (int)($in['batt'] ?? 0)));
    $slide = max(0, min(80, 5 + intdiv($baseKm, 40), (int)($in['slide'] ?? 0)));
    $bumped = max(0, (int)($in['bumped'] ?? 0));
    pts_line($rows, 'Cryptids dodged (' . $dodged . ')', $dodged * 150);
    pts_line($rows, 'Batteries (' . $batt . ')', $batt * 50);
    pts_line($rows, 'Longest slide (' . number_format($slide / 10, 1) . ' s)', $slide * 30);
    if ($won && $bumped === 0) { pts_line($rows, 'Flawless: no cryptid bumped', 2500); }
    return [array_sum(array_column($rows, 1)), $rows];
}

// Points stored for old rows (before v1.8.0), used once by the migration.
function legacy_points_sql(): string {
    return "CASE game
        WHEN 'road' THEN CAST(ROUND(km * 1.5) AS INTEGER)
        WHEN 'surf' THEN CASE WHEN won = 1 THEN 13000 ELSE MAX(0, level - 1) * 2000 END
        ELSE ms END";
}

// Fan points for the Hall of Fame: first time playing each game, and the top 5 of each game.
const PLAY_FAN_PTS = 3;
const TOP_FAN_PTS = [10, 7, 5, 3, 2];
