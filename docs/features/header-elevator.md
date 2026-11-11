# Elevator popover on the Singularity count module (HSElevatorHeader)

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

Decorates the game's `ascSingularityCountStats`; not a mod module. Code `hs-core/header/hs-elevator-header.ts`, CSS
`hs-elevator-header.css`; the box is `HSHeaderPopover` (`hs-header-popover.ts`), shared with the corruption popover.
Hidden setting `singularityHeaderElevator` (on by default), "Sing elevator popover" in the block's "Mod modules" section; off gives the
game's module back, cursor included.

## Rules
- **Contents**: the game's title, target input, ` / max` in grey (the game lowers a higher target without a word, this
  shows where it stops), Teleport (the game's Up! / Down! / Reopen!), the two toggles, the status line. Not the
  description or the lookahead lines: long, and the max replaces the description's "1 to N".
- **Through the game's controls, which work while hidden**: its input's `change` (it checks the target), its toggles'
  click, its button's click, with its Confirms. So going down asks one Confirm, going up or reopening two, then the reset
  sends the player to Buildings as from the tab.
- **Enter or a press inside the popover applies a typed target; closing it (Escape, a press outside) drops it**: locked,
  an applied target changes the next singularity, and the closed popover wouldn't show it. Enter never teleports.
- **State from the live player, the game's controls redrawn first.** The game draws its Elevator only when its subtab
  opens or one of its controls is used, so its input and checkboxes are stale otherwise. At each opening and when the
  player's elevator state changes (read every 250 ms while open, nothing while closed), the player's target is written
  into the game's input and `change` sent: the game redraws, and the popover copies its Teleport text, max and status.
  Writing the input first matters: a stale value there would become the target.
- **Its toggles flip the player's value** (`!player.singularityElevatorLocked`), whatever the checkbox shows: the mod
  clicks only when the player's value differs from the one wanted.
- **Short English texts** (Shewchou's choice, English for everyone, as the corruption popover's toggles): "Lock Future
  Sings" and "Only go up 1 Sing", the game's translated sentences as their tooltips; status "Future Sings LOCKED. You
  will repeat S280." / "Future Sings UNLOCKED. Next will be S291" in the game's colours, one line each. The title stays the
  game's, after "[HS] " (as the corruption popover's).
- **The lock line names the target, not the game's current singularity.** Locked, the game's tab and Singularity Confirm
  say "repeat S{singularityCount}", but `Reset.ts` sets `singularityCount = singularityElevatorTarget`: at S101 with
  target 100, it goes to S100. Unlocked, the next singularity is the last number of the game's line (with "Only go up
  1" off it depends on the lookahead); the game's line as it is if it has none. The game's own texts are left alone.
- **"Only go up 1" is greyed while locked**, not hidden as on the tab, and the box has one width and one line for the
  status: nothing moves when a toggle changes the texts.
- **Below S10** (`highestSingularityCount < 10`, the game's check) only the game's out-of-order title and text: the game
  only hides its controls there, and they still work.
- **Autosing**: Teleport is refused, with a notification (autosing turns the log off while it runs, so no log line
  then): autosing answers every Confirm OK, the player's included, so the click would teleport without a question. The
  target and toggles stay usable. The tab's own button isn't guarded.
- **No live player, no popover** (bookmarklet): a stale target can't be told from the real one, and the check below S10
  needs the player too. The block's line is hidden there.
- Inside an Exalt, Teleport shows the game's own "out of order" Alert.
- Closes on Escape, a press outside, a second click on the module, edit mode, the module hidden, and on Teleport.
