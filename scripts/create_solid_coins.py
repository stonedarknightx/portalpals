import subprocess
from collections import deque

def process_coin(name, src_jpg, out_png):
    print(f'Processing {name} from {src_jpg} -> {out_png}...')
    proc = subprocess.Popen(['convert', src_jpg, 'rgb:-'], stdout=subprocess.PIPE)
    raw, _ = proc.communicate()
    w, h = 1024, 1024
    
    # Background flood-fill from border
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in [0, h - 1]:
            bg[y * w + x] = 1
            q.append((x, y))
    for y in range(h):
        for x in [0, w - 1]:
            if not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
                
    while q:
        cx, cy = q.popleft()
        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not bg[nidx]:
                    r = raw[nidx * 3]
                    g = raw[nidx * 3 + 1]
                    b = raw[nidx * 3 + 2]
                    # Pure outer white background
                    if r >= 242 and g >= 242 and b >= 242:
                        bg[nidx] = 1
                        q.append((nx, ny))
                        
    out_rgba = bytearray(w * h * 4)
    min_x, max_x = w, 0
    min_y, max_y = h, 0
    
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            out_idx = idx * 4
            out_rgba[out_idx] = raw[idx * 3]
            out_rgba[out_idx + 1] = raw[idx * 3 + 1]
            out_rgba[out_idx + 2] = raw[idx * 3 + 2]
            if bg[idx]:
                out_rgba[out_idx + 3] = 0
            else:
                out_rgba[out_idx + 3] = 255
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    with open('/tmp/coin_raw.rgba', 'wb') as f:
        f.write(out_rgba)
        
    cmd = f'convert -size 1024x1024 -depth 8 rgba:/tmp/coin_raw.rgba -trim +repage {out_png}'
    subprocess.check_call(cmd, shell=True)
    print(f'Saved {out_png} with bbox ({min_x},{min_y}) to ({max_x},{max_y})')

process_coin('gold', 'src/assets/images/gold_coin_iso_1791281936175.jpg', 'public/images/gold_coin.png')
process_coin('silver', 'src/assets/images/silver_coin_iso_1791281951393.jpg', 'public/images/silver_coin.png')
subprocess.check_call('cp public/images/gold_coin.png public/gold_coin.png', shell=True)
subprocess.check_call('cp public/images/silver_coin.png public/silver_coin.png', shell=True)
print('Done!')
