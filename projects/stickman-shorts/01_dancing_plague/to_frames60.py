import json,subprocess,os,sys
t=json.load(open('timeline.json')); H=t['handle']
for s in t['shots']:
    out=f"frames_ai60/{s['id']}"
    src=f"ai/clips60/{s['id']}.mp4"
    if not os.path.exists(src) or os.path.exists(out+'/.done'): continue
    need=s['end']-s['start']+2*H
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]))
    k=max(1.0,need/(dur-0.05))
    os.makedirs(out,exist_ok=True)
    subprocess.run(['ffmpeg','-v','error','-y','-i',src,'-vf',f"setpts={k:.4f}*PTS,fps=60",'-q:v','2','-start_number','0',f"{out}/%05d.jpg"],check=True)
    open(out+'/.done','w').close(); print(s['id'],len(os.listdir(out))-1,flush=True)
