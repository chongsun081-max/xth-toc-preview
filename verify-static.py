from pathlib import Path
from urllib.parse import urlsplit,unquote
from lxml import html
from PIL import Image
import hashlib,json,re
site=Path(__file__).resolve().parent
errors=[]; links=0; images=set(); pages=list(site.glob('*.html'))
for p in pages:
 s=p.read_text();doc=html.fromstring(s)
 if len(doc.xpath('//h1'))!=1:errors.append(f'{p.name}: h1 count')
 if not doc.xpath('//html[@lang="en"]'):errors.append(f'{p.name}: language')
 if not doc.xpath('//title')[0].text.endswith("— Men's Denim, Factory Direct"):errors.append(f'{p.name}: title')
 for val in doc.xpath('//@href | //@src'):
  u=urlsplit(val)
  if u.scheme or u.netloc: continue
  target=site/unquote(u.path) if u.path else p
  links+=1
  if not target.is_file(): errors.append(f'{p.name}: missing {val}');continue
  if u.fragment and target.suffix=='.html':
   tree=html.fromstring(target.read_text())
   if not tree.xpath('//*[@id=$id]',id=u.fragment):errors.append(f'{p.name}: bad anchor {val}')
 for val in doc.xpath('//img/@src'):images.add(val)
 for val in re.findall(r'\$([^<\s"\']+)',s):
  if val!='--':errors.append(f'{p.name}: unexpected currency token')
for f in site.rglob('*'):
 if f.is_file() and f.suffix in ['.html','.js','.css','.json','.md']:
  if re.search(r'whole[s]ale|M[O]Q|E[X]W|F[O]B',f.read_text(),re.I):errors.append(f'{f.name}: prohibited vocabulary')
  if re.search(r'(?:\$\s*\d|\b(?:USD|EUR|GBP)\s*\d)',f.read_text(),re.I):errors.append(f'{f.name}: numeric price')
manifest=json.loads((site/'evidence/image-manifest.json').read_text())
for im in images:
 with Image.open(site/im) as image:image.load()
 if hashlib.sha256((site/im).read_bytes()).hexdigest()!=manifest[im]['sha256']:errors.append(f'changed image {im}')
products=json.loads((site/'products.json').read_text())
for p in products:
 file=site/('product-'+p['code'].lower()+'.html')
 tree=html.fromstring(file.read_text())
 assert tree.xpath('//input[@name="size"]/@value')==p['sizes']
 assert tree.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," gallery ")]//img/@src')==p['images']
 assert tree.xpath('//select[@name="color"]/option/text()')==p['colors']
shop=html.fromstring((site/'shop.html').read_text())
cards=shop.xpath('//article[contains(@class,"product-card")]')
assert len(cards)==42
assert len({c.xpath('.//small/text()')[0] for c in cards})==42
for code in ['a811','a812']:
 tree=html.fromstring((site/f'product-{code}.html').read_text())
 assert len(tree.xpath('//div[@class="purchase-buttons"]/button'))==1
 assert len(tree.xpath('//div[@class="purchase-buttons"]/a'))==1
 assert tree.xpath('//div[@class="mobile-buy"]/button/@form')==['purchase-form']
 assert tree.xpath('//input[@name="size"]/@value')==['M','L','XL','2XL','3XL']
 im=f'img/{code}-1-600.webp'
 assert (site/im).read_bytes()==Path(manifest[im]['source']).read_bytes()
copy=(site.parent/'gemini-copy-20261119.md').read_text()
selling=next(line.split(': ',1)[1] for line in copy.splitlines() if line.startswith('- A811 —'))
assert selling in (site/'product-a811.html').read_text()
assert not any('image-pending' in p.read_text() for p in pages)
for filename in ['index.html','shop.html']:
 tree=html.fromstring((site/filename).read_text())
 assert tree.xpath('//a[@href="product-a811.html"]/img[@src="img/a811-1-600.webp"]')
result={'html_pages':len(pages),'local_references_checked':links,'unique_images_decoded':len(images),'images_hash_match':True,'shop_unique_styles':len(cards),'errors':errors,'http_browser_mobile':'Not run in this patch; static checks do not verify browser rendering'}
(site/'evidence/static-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));assert not errors
