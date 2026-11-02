#!/usr/bin/env python3
"""Optional maintainer tool: redraw the flight article's SVGs from its checked data.

Requires matplotlib for the three numerical plots. The website build does not
run this script, need Python, or load original game files.
"""
from pathlib import Path
from html import escape
import json
import os

os.environ.setdefault('MPLCONFIGDIR', '/tmp/darker-flight-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/images/flight'
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((ROOT / 'public/data/flight-figures-data.json').read_text())
NAVY, PANEL, INK, MUTED = '#101923', '#192a36', '#e4eced', '#a9bbc4'
GOLD, TEAL, ROSE, LINE = '#ebca80', '#8bc7bd', '#c993a6', '#4b6473'


def text(x, y, value, kind='', anchor='start'):
    return f'<text x="{x}" y="{y}" class="{kind}" text-anchor="{anchor}">{escape(value)}</text>'


def box(x, y, width, height, colour=PANEL):
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="{colour}" rx="5"/>'


def line(points, colour=GOLD, width=2, extra=''):
    return f'<path d="{points}" fill="none" stroke="{colour}" stroke-width="{width}" {extra}/>'


def arrow(x, y, dx, dy):
    return line(f'M{x},{y} L{dx},{dy}', extra='marker-end="url(#arrow)"')


def dot(x, y, radius=6, colour=GOLD):
    return f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{colour}"/>'


def save_svg(name, height, title, body):
    (OUT / name).write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="{height}" viewBox="0 0 800 {height}" role="img" aria-labelledby="title">
<title id="title">{escape(title)}</title>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="{GOLD}"/></marker></defs>
<style>text{{font:18px system-ui,sans-serif;fill:{INK}}}.small{{font-size:15px;fill:{MUTED}}}.head{{font-size:21px;font-weight:650}}.gold{{fill:{GOLD}}}</style>
<rect width="800" height="{height}" rx="6" fill="{NAVY}"/>{body}</svg>''')


body = text(28,38,'Three angles; two movement components','head')
for x, title in [(25,'Pitch · side view'),(285,'Roll · front view'),(545,'Heading · top view')]:
    body += box(x,65,230,204) + text(x+115,95,title,'','middle')
body += line('M55,195 H220',LINE,2,extra='stroke-dasharray="5 5"')
body += line('M65,211 L205,154 L165,160 M65,211 L109,172',TEAL,5)
body += line('M172,195 Q175,172 188,161',extra='marker-end="url(#arrow)"')
body += text(140,247,'nose up / down','small','middle')
body += line('M315,185 H485',LINE,2,extra='stroke-dasharray="5 5"')
body += line('M323,213 L477,157',TEAL,5)+dot(400,185,10,TEAL)
body += line('M462,190 Q475,177 466,159',extra='marker-end="url(#arrow)"')
body += text(400,247,'bank left / right','small','middle')
body += line('M660,205 V122',LINE,2,extra='stroke-dasharray="5 5"')
body += line('M613,209 L702,138 L686,213 L659,188 Z',TEAL,4)
body += line('M661,129 Q681,125 699,136',extra='marker-end="url(#arrow)"')
body += text(660,247,'turn around the horizon','small','middle')
body += arrow(45,307,190,307)+text(211,313,'horizontal motion','small')
body += arrow(474,330,474,287)+text(497,313,'climb / sink separately','small')
save_svg('attitude.svg',360,'Attitude and movement are different state',body)

body = text(28,38,'Same inputs, different flight controllers','head')
body += box(185,60,430,54)+text(400,94,'Keyboard / mouse → bank + pitch demand','','middle')
columns = [
    (25,'Surface Caero', ['Angular response','Buffer + active boost','Horizontal movement','Sample one beacon','Charge + beacon lift']),
    (285,'Surface Skimma', ['Shield accumulation','Speed-dependent response','Selected drive setting','Horizontal movement','Speed-generated lift']),
    (545,'Underground Caero', ['Connection power','Smooth manual demand','Trace / reacquire route','Alignment + resistance','Route / slow aiming']),
]
for x,title,steps in columns:
    body += arrow(400,114,x+115,146)+box(x,153,230,238)
    body += text(x+115,184,title,'head','middle')
    for i,label in enumerate(steps):body += text(x+115,222+32*i,label,'small','middle')
    body += arrow(x+115,391,x+115,424)
body += box(25,432,750,52)+text(400,465,'Integrate movement → collision and lifecycle → camera / render','','middle')
save_svg('controllers.svg',510,'Three flight controllers share the surrounding game loop',body)

body = text(28,38,'Each region selects one beacon','head')
body += box(30,70,370,215,'#302737')+box(400,70,370,215,'#203b3d')
for x in range(80,771,53):body += line(f'M{x},70 V285',LINE,.6)
body += line('M400,70 V350',GOLD,2,extra='stroke-dasharray="7 5"')
for x,colour in [(160,ROSE),(640,TEAL)]:
    body += line(f'M{x-18},255 L{x-12},174 L{x+12},174 L{x+18},255 Z',colour,3)
    body += dot(x,160,17,colour)
body += text(160,116,'Selected left tower','small','middle')+text(640,116,'Selected right tower','small','middle')
body += text(160,277,'(54, 63) · strength 0','small','middle')+text(640,277,'(63, 63) · strength 255','small','middle')
body += arrow(160,321,640,321)+text(400,377,'Nine cells between tower centres · boundary halfway','small','middle')
save_svg('beacon-selection.svg',420,'Beacon selection regions',body)

body = text(28,38,'Beacon power is used immediately and stored','head')
body += box(270,61,260,72)+text(400,91,'Current beacon input','head','middle')+text(400,117,'admitted with engine on','small','middle')
for x in (140,400,660):body += arrow(400,133,x,205)
for x,title,caption in [(25,'Immediate effects','lift + next forward bias'),(285,'Working buffer','ordinary drive + transfer'),(545,'Stored boost','complete cells accumulate')]:
    body += box(x,214,230,88)+text(x+115,246,title,'head','middle')+text(x+115,277,caption,'small','middle')
body += arrow(400,302,140,399)+arrow(400,302,400,399)+arrow(660,302,660,399)
body += text(681,352,'Enter','small')
for x,title,caption in [(25,'Ordinary drive','buffer spent each update'),(285,'Weapon charge','limited by incoming power'),(545,'Active boost','temporary drive budget')]:
    body += box(x,410,230,88)+text(x+115,442,title,'head','middle')+text(x+115,473,caption,'small','middle')
body += text(400,535,'Ordinary drive and active boost both feed forward demand.','small','middle')
save_svg('energy-flow.svg',560,'The Caero has separate working, weapon and boost stores',body)

body = text(28,38,'Following a tunnel bend','head')
body += line('M40,351 Q204,351 204,201 Q204,101 417,101',LINE,42)
body += line('M40,351 Q204,351 204,201 Q204,101 417,101',TEAL,2,extra='stroke-dasharray="8 6"')
body += line('M90,340 Q160,290 146,223 Q149,177 222,139',ROSE,2,extra='stroke-dasharray="4 5"')
body += line('M125,251 L170,200 L170,257 L147,240 Z',INK,3)
body += arrow(164,224,330,106)+dot(330,103,8)
body += text(292,76,'lookahead target','small')+text(60,396,'Route centreline and offset craft','small')
body += box(460,88,310,287)+text(480,122,'Each guided update','head')
for i,desc in enumerate(['1  Trace a path ahead','2  Compare attitude to target','3  Blend manual demand','4  Reduce gain if opposed','5  Deduct route resistance']):body += text(480,166+39*i,desc,'small')
save_svg('tunnel-guidance.svg',440,'A tunnel controller blends path following and manual steering',body)

plt.rcParams.update({
    'font.family':'DejaVu Sans', 'font.size':11, 'figure.facecolor':NAVY,
    'axes.facecolor':NAVY, 'axes.edgecolor':LINE, 'axes.labelcolor':INK,
    'text.color':INK, 'xtick.color':MUTED, 'ytick.color':MUTED,
    'grid.color':LINE, 'grid.alpha':.4, 'svg.fonttype':'none', 'svg.hashsalt':'darker-flight',
})


def chart(name, height, draw):
    fig, ax = plt.subplots(figsize=(8, height/100), dpi=100)
    fig.subplots_adjust(left=.115, right=.96, top=.79, bottom=.18)
    ax.spines[['top','right']].set_visible(False)
    ax.grid(axis='y', linewidth=.6)
    draw(fig,ax)
    fig.savefig(OUT/name,format='svg',metadata={'Date':None,'Creator':'Lost Engines; matplotlib'})
    svg = OUT / name
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines()) + '\n')
    plt.close(fig)


def power(fig,ax):
    fig.text(.04,.94,'Power received between two fully lit beacons',fontsize=15,weight='bold')
    fig.text(.04,.88,'Nine cells between the towers; three sampling heights.',fontsize=10,color=MUTED)
    for profile,colour in zip(DATA['power_profiles'][:3],[ROSE,GOLD,TEAL]):
        ax.plot([i/32 for i in range(289)],profile['samples'],color=colour,label=f"Height {profile['height']:,}",linewidth=2)
    ax.axvline(4.5,color=MUTED,linestyle=':',linewidth=1)
    ax.set(xlim=(0,9),ylim=(0,14500),xlabel='Distance from left tower centre (map cells)',ylabel='Incoming power B')
    ax.set_xticks([0,1,2,3,4.5,6,7,8,9])
    ax.legend(frameon=False,labelcolor=INK,fontsize=10,loc='upper center')
chart('power-profile.svg',470,power)


def bank(fig,ax):
    fig.text(.04,.94,'Lift through a half-roll',fontsize=15,weight='bold')
    fig.text(.04,.88,'Zero pitch; each lift term divided by its own upright value.',fontsize=10,color=MUTED)
    samples=DATA['bank_curves']
    ax.plot([r[0] for r in samples],[r[2]/samples[0][2] for r in samples],color=GOLD,label='Caero · absolute projection',linewidth=2)
    ax.plot([r[0] for r in samples],[r[4]/samples[0][4] for r in samples],color=TEAL,label='Skimma · signed projection',linewidth=2)
    ax.axhline(0,color=MUTED,linewidth=1)
    ax.set(xlim=(0,180),ylim=(-1.15,1.25),xlabel='Bank angle (degrees)',ylabel='Relative lift contribution')
    ax.set_xticks([0,30,60,90,120,150,180])
    ax.legend(frameon=False,labelcolor=INK,fontsize=10,loc='upper center')
chart('bank-lift.svg',470,bank)


def response(fig,ax):
    fig.text(.04,.94,'The Skimma loses steering gain as speed rises',fontsize=15,weight='bold')
    fig.text(.04,.88,'Gain = (2047 − speed)² / 128, with integer truncation.',fontsize=10,color=MUTED)
    speeds=range(0,2048)
    ax.plot(speeds,[((2047-s)**2>>7)/(2047**2>>7)*100 for s in speeds],color=TEAL,linewidth=2)
    ax.set(xlim=(0,2047),ylim=(0,105),xlabel='Internal speed measure',ylabel='Gain (% of zero-speed value)')
    ax.set_xticks([0,300,600,1000,1500,2047])
chart('skimma-response.svg',440,response)
print('Wrote five explanatory diagrams and three numerical plots.')
