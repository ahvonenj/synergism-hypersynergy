# Auto-Sing guide

Auto-Sing plays singularities for you, following a strategy. It's for the end game: S216+, and it only works fully once you've cleared EXALT6. It needs Tampermonkey or Steam: with the bookmark, it's slow and unreliable.

## Getting started

1. Open the mod panel (the mod's icon, top left), then Settings → **Auto-Sing**.
2. **Strategy:** pick one. The default strategies are a place to start; some of them are meant for the very end of the game. To make your own, see [Making your own strategy](#making-your-own-strategy).
3. **Ambrosia loadouts:** for each role (pre-AOAG cubes, post-AOAG cubes, quarks, obtainium, offerings, luck), pick the game slot that holds that loadout. The Ambrosia Heater (Tools tab) finds the best ones for your save. Each loadout switch resets the ambrosia bars' progress. If you don't want that, tick **Don't switch ambrosia loadouts**: Auto-Sing then never switches.
4. Turn on **Start/Stop Auto-Sing**, or click ▶ in the menu by the mod's icon.

The Auto-Sing window shows the time per singularity, the quarks and golden quarks gained per second, and how much of your quarks came from the Ants to Quark Corner. Its buttons: ⏸️ pause, 🔄 restart the singularity, 🟠 stop at the end of this singularity, 🔴 stop now, 📋 step timings (with **Record step timings** on), 📊 details.

## Which singularity to farm

- Start low: a singularity should take 15 to 20 seconds at most. That can be 30 singularities below your highest, and that's normal.
- Then go up one singularity at a time, as long as golden quarks per second keep going up.
- Wait for 10 to 15 singularities before you compare: one singularity alone varies too much.

## Keep the game running

Auto-Sing keeps its speed when the game is in another tab. Two things can still stop it:
- **The computer going to sleep.** The **Keep the PC awake** setting prevents it while the game is in view. On Steam, it also works while the window is minimized or covered and while the PC is locked. In a browser, it doesn't: for another tab, a minimized or covered window, or a locked PC, change your computer's sleep settings instead.
- **Chrome's Energy Saver** (a leaf icon next to the address bar). It can freeze a hidden tab after 5 minutes. Turn it off in `chrome://settings/performance`, or keep the game window in view.

---

## Making your own strategy

### How Auto-Sing follows a strategy

A strategy is a list of **phases**. Each phase covers a part of the singularity, from one game stage to another. To see your current stage: the game's Settings → Stats for Nerds → Miscellaneous.

- Phases follow each other: the first starts at "start", each one starts where the previous one ends, and the last one ends at "end".
- Auto-Sing reads the current stage, runs the steps of the phase that covers it from top to bottom, then reads the stage again. A phase runs again as long as the stage stays in its range.
- A phase doesn't reset by itself. Only Ascend, Exit Ascension challenge, entering an ascension challenge and "Set corruption level" (with Ascend immediately) do.
- **AOAG phase:** once the AOAG rune is unlocked (P4x5), Auto-Sing stops the current phase and runs the AOAG phase, then the phase that ends at "end".
- At the end, Auto-Sing switches to your Quark loadout, ascends and exports the save for the bonus quarks, then starts a new singularity.

### The strategy window

In Settings → Auto-Sing:
- **➕ Create** opens a blank strategy.
- **✏️ Edit** opens the selected one. Default strategies can't be changed: Edit opens a copy that you save under a new name.
- **📤 Export** copies the strategy to share it; **📥 Import** adds one from a copy.

In the window:
- **Strategy Name** at the top.
- Each row is a phase: **Phase N: start → [end ▾] [✎ k steps] [×]**. Change a phase's end with its dropdown, open its steps with ✎, delete it with ×.
- The dashed **AOAG Unlocked Phase** row sits right before the phase that ends at "end", which is where it runs. Hover its **?** to see when it starts.
- **Add phase until… ▾** adds the next phase. The round **+** on a phase's left border inserts a phase inside it.
- "0 steps" in red: a phase needs at least one step.
- **Create Strategy** / **Update Strategy** saves. A strategy must go all the way to "end".

### The actions window (✎)

Steps run from top to bottom. Pick a **Special Action**, fill in the fields shown, then click **Add** (or press Enter). New steps go where **Add Here** is; drag it to add elsewhere.

**None** = a challenge step:
- **Challenge #**: the challenge (1–15).
- **Min Completions**: stay in it until it has this many. 0 = enter it, then wait.
- **Wait before (ms)**: wait before the step starts.
- **Wait inside (ms)**: once Min Completions is reached, wait this long before the next step.
- **Max Time (ms)**: go to the next step after this long, even if Min Completions isn't reached (Wait before not counted).

The other actions are grouped in the dropdown (Exit and Ascend, Game actions, Challenges, Ambrosia loadouts, Corruption level…). Each shows only the fields it uses. A few:
- **601-610 - C1-C10 until no more completions**: runs one of C1–C10 until it stops getting completions.
- **403 - Set corruption level**: sets the level used from the next ascension. With **Ascend immediately** ticked, it ascends right away (or leaves the current ascension challenge). Set the actual level: the game adds your free levels on top.
- **Store C15**: keeps C15's current score for an IF step to compare against.

#### If-jump steps

An If-jump step (an IF row in the list) jumps to its **Jump here** row when its condition holds, else the steps continue below it.
- **Challenges** mode: compares a challenge's completions (If Challenge) with Value, using > or <.
- **Stored C15 value** mode: compares C15's current score with the stored score × 10^Multiplier.
- **Max jumps**: the IF jumps at most this many times per phase run, then continues below it even if its condition still holds (0 = no limit). It keeps an account that never reaches a C15 target from looping forever. The default strategies' last C15 loop has 5.
- The IF row says where it jumps (→ step N), and the Jump here row which IF it belongs to: click either one to see the other. ↺ means the IF jumps back (a loop).
- Drag the Jump here row to choose where it jumps. If you move a step, the IF doesn't follow it.

#### Editing steps

- ✎ on a step loads it into the fields: change them, then **Update step N**.
- ⧉ duplicates a step, × deletes it, ⋮⋮ drags it.
- Undo / Redo (Ctrl+Z / Ctrl+Y) are at the bottom, next to **Fixed time**: the time the phase spends waiting, IF jumps not followed.
- Comments are just for you.

**Save** in the actions window only keeps your changes in the strategy window. Click **Update Strategy** (or **Create Strategy**) there to save for good.

### Testing a strategy

Turn on **Record step timings** in Settings → Auto-Sing, then start Auto-Sing. 📋 in the Auto-Sing window shows where a singularity's time goes, step by step:
- **Runs**: times per singularity. **ms**: time per singularity. **%**: its part of a singularity. **Wait**: the part of ms spent in the step's Wait before.
- **Between singularities** and **Outside the steps** are the time spent in no step of your strategy.
- Click a column's title to sort by it. **Copy** gives the table as text, to compare two runs or share one.

To compare two versions of a strategy:
- Run each for 10 to 15 singularities: one singularity alone varies too much.
- Keep the same ambrosia loadouts: two heats at the same singularity can differ by 15%.
- Look at both quarks and golden quarks per hour, not only the time.
- The table is emptied at the next start: Copy it first.
