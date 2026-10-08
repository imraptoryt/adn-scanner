# Laser weapon sound pack (GTA V / FiveM)

38 weapons, each with its own laser sound, plus two pitch variations (`_v2`, `_v3`).
Every file is a **WAV, 32 kHz, mono, 16-bit**, which is the format GTA V weapon audio uses.

`wav/silence.wav` is 50 ms of silence. Use it to mute original layers you don't want, such as the gunshot echo tail.

Regenerate or tweak the sounds with `python3 generate.py` (needs `numpy`). Each weapon is one line in the `WEAPONS` table at the top.

## Sound families

| Family | Character |
|---|---|
| Pistols | short, bright "pew" with a small echo. `.50`, heavy pistol and revolver are deeper, with a low thump |
| SMGs | very short (60–90 ms) blips so they don't smear at high fire rate. Some are bit-crushed |
| Rifles | punchy 110–140 ms zaps with a low thump, layered or ring-modulated so each one is different |
| MGs / minigun | tight and aggressive. The minigun is a 50 ms blip |
| Shotguns | 4–6 detuned lasers fired at once, plus a noise burst, so they sound like a spread |
| Snipers | long downward sweep with a big echo tail |
| `railgun` / `flare_gun` | special cases. The flare gun sweeps *upward* |

## Building the RPF for the FiveM `mods` folder

You do this on Windows with **OpenIV**, because the RPF has to start from your own copy of the game's audio archive.

1. Copy `WEAPONS_PLAYER.rpf` from your GTA V folder: `Grand Theft Auto V\x64\audio\sfx\WEAPONS_PLAYER.rpf`.
   Work on the copy, never the original.
2. Open the copy in OpenIV and turn on **Edit mode**.
3. Each weapon has its own `.awc` (named after the weapon class, e.g. pistol, SMG, rifle…). Open it to see the sounds inside.
4. Select a fire/shot sound, choose **Replace**, and pick the matching WAV from `wav/`. If the weapon has several shot variations, use `_v2` and `_v3` for them.
   - Leave reload, cocking and handling sounds alone.
   - To kill the original echo tail (it sounds odd under a laser), replace it with `silence.wav`.
5. Save, then put the edited `WEAPONS_PLAYER.rpf` in
   `%localappdata%\FiveM\FiveM.app\mods\`
   and restart FiveM.

**Alternative with CodeWalker:** in its RPF Explorer, export an `.awc` as XML (you get a folder of WAVs). Overwrite the WAVs with these, **keeping the original file names**, then import the XML back.

### Notes
- Weapons added in DLCs (e.g. the Mk II weapons, and newer weapons such as the military rifle and the railgun) keep their audio inside DLC packs (`update\x64\dlcpacks\…`), not in `WEAPONS_PLAYER.rpf`. Those need their own pack edited the same way.
- Servers set to `sv_pureLevel 2` block everything in the mods folder. Level 1 allows audio mods.
- The edited RPF contains Rockstar's original audio, so don't redistribute it. Share these WAVs and the guide instead.
