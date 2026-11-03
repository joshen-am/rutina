import re, sys
p='exercises.js'; s=open(p).read()
def setb(key, text):
    global s
    i=s.index('    '+key+': {')
    m=re.compile(r'\n    [a-z_0-9]+: \{|\n  \};').search(s, i+10)
    s=s[:i]+'    '+text.strip()+s[m.start():]
exec(open(sys.argv[1]).read())
open(p,'w').write(s)
print('ok')
