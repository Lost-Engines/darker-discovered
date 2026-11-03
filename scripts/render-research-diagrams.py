#!/usr/bin/env python3
"""Regenerate article diagrams using the committed maps and documented formulas."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INK = '#e4e8e9'
MUTED = '#a5b2bc'
TEAL = '#94c8bf'
GOLD = '#ebca80'
RED = '#e59a9a'


def text(x, y, value, size=18, color=INK, anchor='start'):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" text-anchor="{anchor}">{html.escape(str(value))}</text>'


def box(x, y, w, h, label, sub='', color=TEAL):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="#1c2b33" stroke="{color}"/>'
            + text(x + w / 2, y + 29, label, 19, color, 'middle')
            + (text(x + w / 2, y + 55, sub, 15, MUTED, 'middle') if sub else ''))


def line(x1, y1, x2, y2, color=MUTED, arrow=False, width=2):
    marker = ' marker-end="url(#arrow)"' if arrow else ''
    return f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="{width}"{marker}/>'


def save(name, height, title, body):
    dest = ROOT / 'public/images' / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 {height}" width="880" height="{height}" role="img" aria-labelledby="title">
<title id="title">{html.escape(title)}</title>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{MUTED}"/></marker></defs>
<rect width="880" height="{height}" fill="#101923"/>
<g font-family="system-ui,sans-serif">{body}</g></svg>\n''')


save('sound/playback.svg', 410, 'The music playback path',
     text(30, 37, 'FROM MUSIC RESOURCE TO AUDIO', 18, GOLD)
     + box(30, 68, 240, 75, 'Arrangement', 'notes · waits · loop pointers')
     + line(272, 105, 324, 105, arrow=True)
     + box(330, 68, 235, 75, 'Timed interpreter', 'tempo + per-part state')
     + line(568, 105, 619, 105, arrow=True)
     + box(625, 68, 225, 75, 'Device events', 'registers / MIDI / API')
     + line(738, 146, 738, 197, arrow=True)
     + box(625, 205, 225, 75, 'Synthesiser', 'chip state → samples')
     + line(621, 242, 572, 242, arrow=True)
     + box(330, 205, 235, 75, 'Audio output', '48 kHz emulated renders')
     + box(30, 205, 240, 75, 'Instrument data', 'FM patches · ROM · GUS RAM')
     + line(150, 282, 150, 325)
     + line(150, 325, 738, 325)
     + line(738, 325, 738, 284, arrow=True)
     + text(30, 380, 'The selected driver determines both the arrangement and its route to the hardware.', 17, MUTED))

body = text(30, 36, 'OPENING LAPC-I LOOP BOUNDARIES', 18, GOLD)
x = lambda tick: 170 + tick / 30000 * 660
for y, name, length, color in [(108, '11 parts', 9168, TEAL), (224, 'Part 10', 8784, GOLD)]:
    body += text(26, y + 21, name, 18, color)
    for i in range(3):
        start, end = x(i * length), x((i + 1) * length)
        body += f'<rect x="{start:.2f}" y="{y}" width="{end-start:.2f}" height="42" fill="{color}" opacity="{0.22 + i*.08}" stroke="{color}"/>'
        body += text((start+end)/2, y+28, f'{length:,} ticks', 16, INK, 'middle')
        body += text(end, y+67, f'{(i+1)*length:,}', 14, color, 'middle')
body += line(170, 63, 170, 293, '#73818a')
body += text(170, 82, 'First shared jump', 16, MUTED)
body += text(30, 344, 'Elapsed musical ticks after the first jump. Each short loop gains another 384 ticks.', 17, MUTED)
save('sound/loops.svg', 370, 'Different loop lengths in the opening Roland arrangement', body)

body = text(30, 36, 'ONE RECORD, SEVERAL JOBS', 18, GOLD)
rows = [('Configuration', 'craft · bank · map', 'Load the world'),
        ('Beacon and cell lists', 'fade queue · flags · objectives', 'Prepare city state'),
        ('Object templates', 'active · reserve · free', 'Populate object lists'),
        ('Scripts + language sections', 'entry points · commands · text', 'Present and run the mission')]
for i, (a,b,c) in enumerate(rows):
    y = 60 + i * 89
    body += box(30, y, 365, 72, a, b)
    body += line(400, y+36, 481, y+36, arrow=True)
    body += box(490, y, 360, 72, c, color=GOLD)
body += text(30, 426, 'The player and other objects retain their own script continuations during flight.', 16, MUTED)
save('missions/record.svg', 440, 'Components of a mission record', body)

body = text(30, 36, 'SAVING THE CITY BETWEEN MISSIONS', 18, GOLD)
body += box(30, 70, 235, 75, 'Committed city state', 'two bits per eligible cell')
body += line(270, 107, 325, 107, arrow=True)
body += box(330, 70, 220, 75, 'Current attempt', 'new damage + flags')
body += line(553, 107, 615, 107, arrow=True)
body += box(622, 70, 228, 75, 'Successful return', 'write updated city stream', GOLD)
body += line(440, 148, 440, 205, arrow=True)
body += box(330, 213, 220, 75, 'Failed attempt', 'previous stream retained', RED)
body += line(330, 250, 148, 250)
body += line(148, 250, 148, 150, arrow=True)
body += text(30, 330, 'Reload: original map + committed state + regenerated model variants', 18, MUTED)
save('missions/persistence.svg', 355, 'How city damage survives progression and retry', body)

body = text(30, 35, 'ONE HIT AGAINST A SKIMMA SUPA (R = 40)', 18, GOLD)
left, right, top, bottom = 95, 815, 68, 305
px = lambda s: left + s / 100 * (right-left)
py = lambda d: bottom - d / 65536 * (bottom-top)
for amount in [0, 32768, 65536]:
    body += line(left, py(amount), right, py(amount), '#34424e')
    body += text(left-12, py(amount)+6, f'{amount:,}', 15, MUTED, 'end')
points = []
previous = 1
for s in range(101):
    d = 1 if s <= 40 else 65536 if s >= 80 else 257*((256*(s-40)+40)//40)+1
    if s:
        points.append(f'{px(s):.2f},{py(previous):.2f}')
    points.append(f'{px(s):.2f},{py(d):.2f}')
    previous = d
body += f'<polyline points="{" ".join(points)}" fill="none" stroke="{TEAL}" stroke-width="3"/>'
for s in [0, 20, 40, 60, 80, 100]:
    body += text(px(s), bottom+26, str(s), 16, MUTED, 'middle')
body += text(440, 367, 'Impact strength S', 19, INK, 'middle')
body += text(100, 56, 'Damage added', 15, MUTED)
body += f'<circle cx="{px(52)}" cy="{py(19790)}" r="6" fill="{GOLD}"/>'
body += text(px(52)+16, py(19790)+20, 'Pinner: 52 → 19,790', 17, GOLD)
body += text(px(80)-5, top-13, 'Fatal at 80', 16, TEAL, 'end')
save('combat/resistance.svg', 400, 'Impact strength versus damage for a Supa', body)

body = text(30, 36, 'AN OFFICE ENTRANCE: TWO APPROACHES', 18, GOLD)
body += text(220, 77, 'Plan / cut through doorway', 17, MUTED, 'middle')
body += text(655, 77, 'Side section', 17, MUTED, 'middle')
# Schematic volumes only: the thin target is recessed behind the entrance.
body += '<path d="M55 115 H385 V292 H245 V246 H195 V292 H55 Z" fill="#493e4d" stroke="#e59a9a" stroke-width="2"/>'
body += '<rect x="195" y="228" width="50" height="18" fill="#94c8bf"/>'
body += line(115, 348, 115, 295, RED, True, 4)
body += line(220, 348, 220, 249, TEAL, True, 4)
body += text(70, 370, 'Protected wall', 15, RED)
body += text(238, 326, 'Through entrance', 15, TEAL)
body += '<path d="M490 115 H820 V290 H700 V246 H490 Z" fill="#493e4d" stroke="#e59a9a" stroke-width="2"/>'
body += '<rect x="684" y="246" width="16" height="44" fill="#94c8bf"/>'
body += line(490, 292, 830, 292, MUTED)
body += line(500, 271, 681, 271, TEAL, True, 4)
body += text(654, 331, 'Thin vulnerable volume', 17, TEAL, 'middle')
body += text(654, 356, 'behind the opening', 17, MUTED, 'middle')
save('combat/doorway.svg', 390, 'Schematic of protected office walls and a vulnerable entrance', body)

body = text(30, 36, 'FORBES DIFFUSER: GAS HIT TO EXPIRY', 18, GOLD)
start, finish = 55, 825
split = start + (finish-start)*6144/10240
body += f'<rect x="{start}" y="82" width="{split-start}" height="54" fill="#493e4d"/>'
body += f'<rect x="{split}" y="82" width="{finish-split}" height="54" fill="#386e68"/>'
body += text((start+split)/2, 116, 'Smoke developing', 20, INK, 'middle')
body += text((split+finish)/2, 116, 'Trigger accepted', 20, INK, 'middle')
for point, value in [(start, '0'), (split, '6,144 ticks'), (finish, '10,240 ticks')]:
    body += line(point, 72, point, 146)
    body += text(point, 173, value, 16, MUTED, 'middle')
body += text(55, 209, 'Gas hits', 16, MUTED)
body += text(split, 209, '≈12.29 s', 16, TEAL, 'middle')
body += text(finish, 209, '≈20.48 s', 16, MUTED, 'end')
save('combat/diffuser.svg', 230, 'The Diffuser trigger timing window', body)

body = text(30, 36, 'INTERRUPT 1 SWITCHES THE STREAM', 18, GOLD)
for x, name, color in [(50,'Stream A',TEAL),(630,'Stream B',GOLD)]:
    body += text(x+95, 80, name, 20, color, 'middle')
    for i in range(3):
        body += box(x, 100+i*90, 190, 62, f'{name[-1]}{i}', color=color)
for x1,y1,x2,y2 in [(243,131,625,131),(625,158,245,221),(243,242,625,242),(625,269,245,311),(243,332,625,332)]:
    body += line(x1,y1,x2,y2,arrow=True)
body += text(435, 114, 'saved IP ↔ SI', 17, MUTED, 'middle')
body += text(435, 387, 'Each stream resumes at its saved next-instruction address.', 17, MUTED, 'middle')
save('loader/interleave.svg', 410, 'Two instruction streams interleaved by the trap handler', body)

body = text(30, 36, 'WHERE THE 65,536 OUTPUT BYTES COME FROM', 18, GOLD)
x = 30
for count,label,color in [(18669,'Byte literals',TEAL),(17556,'Word runs',GOLD),(29311,'Back-references','#b4abd1')]:
    width = 820*count/65536
    body += f'<rect x="{x:.2f}" y="75" width="{width:.2f}" height="55" fill="{color}"/>'
    body += text(x+width/2, 161, label, 18, INK, 'middle')
    body += text(x+width/2, 190, f'{count:,} bytes', 16, MUTED, 'middle')
    x += width
save('loader/output.svg', 220, 'Sources of bytes in the unpacked executable', body)

before = json.loads((ROOT/'public/data/map-199538.json').read_text())
after = json.loads((ROOT/'public/data/map-68.json').read_text())
counts = {'added':0, 'removed':0, 'changed':0}
body = text(30, 36, 'FROM THE LATER DEMO TO RETAIL DELPHI', 18, GOLD)
for panel, title in enumerate(['Later demo', 'Retail Delphi', 'Changed cells']):
    ox, oy, scale = 30+panel*288, 100, 2
    body += text(ox+128, 78, title, 20, INK, 'middle')
    body += f'<rect x="{ox}" y="{oy}" width="256" height="256" fill="#162331"/>'
    paths = {}
    for i,(b,a) in enumerate(zip(before,after)):
        color = None
        if panel < 2:
            if (b if panel == 0 else a): color = '#94c8bf'
        elif a and not b:
            color=TEAL; counts['added']+=1
        elif b and not a:
            color=RED; counts['removed']+=1
        elif a != b:
            color=GOLD; counts['changed']+=1
        elif a: color='#34424e'
        if color:
            paths.setdefault(color,[]).append(f'M{ox+(i%128)*scale},{oy+(i//128)*scale}h2v2h-2z')
    for color, commands in paths.items():
        body += f'<path d="{"".join(commands)}" fill="{color}" shape-rendering="crispEdges"/>'
    body += text(ox, 380, '0', 14, MUTED)
    body += text(ox+256, 380, '127', 14, MUTED, 'end')
assert counts == {'added':972,'removed':29,'changed':34}, counts
for i,(label,n,color) in enumerate([('Added',972,TEAL),('Removed',29,RED),('Type changed',34,GOLD)]):
    x=30+i*288
    body += f'<rect x="{x}" y="422" width="18" height="18" fill="{color}"/>'
    body += text(x+28, 438, f'{label}: {n}', 18, INK)
body += text(30, 489, 'Each square is one map cell. Pale cells are occupied; dark cells are empty.', 17, MUTED)
body += text(30, 513, 'The difference map retains unchanged occupied cells in grey.', 16, MUTED)
save('demos/city-growth.svg', 530, 'Occupancy changes between the 1995 demo and retail Delphi', body)

body = text(30, 36, 'ELAPSED TIME ADMITTED TO ONE FRAME', 18, GOLD)
left, right, top, bottom = 85, 815, 70, 245
px = lambda x: left+x/200*(right-left)
py = lambda y: bottom-y/200*(bottom-top)
for y in [0,80,160,200]:
    body += line(left, py(y), right, py(y), '#34424e')
    body += text(left-12, py(y)+5, str(y), 15, MUTED, 'end')
for x in [0,40,80,120,160,200]: body += text(px(x), bottom+27, str(x), 15, MUTED, 'middle')
body += line(px(0),py(0),px(200),py(200),GOLD,False,4)
body += line(px(0),py(0),px(80),py(80),TEAL,False,3)
body += line(px(80),py(80),px(200),py(80),TEAL,False,3)
body += text(515,100,'Earlier demo',18,GOLD)
body += text(470,py(80)+30,'Later demo + retail: 80-tick cap',18,TEAL)
body += text(85,58,'Simulation ticks',15,MUTED)
body += text(440,311,'Elapsed timer ticks since the previous frame',18,INK,'middle')
save('demos/timestep.svg', 330, 'Elapsed-time cap introduced in the later demo', body)

print('Wrote 11 explanatory SVGs; checked demo map counts against the committed data.')
