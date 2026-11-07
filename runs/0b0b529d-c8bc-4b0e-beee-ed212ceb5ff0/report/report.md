# Pinterest capture report

## Summary

- Account: alexandrakancewick
- Pins in the manifest: 5
- Captured: 5
- Skipped: 0
- Deleted: 4
- Boards complete: no, the board cap or pin cap cut the run short
- Folder: /home/alex/Documents/Pinterest

## Boards

- Clay (clay)
- Diy gift (diy-gift)

## Captured

| Board | Pin | Kind | Path | Tags |
|---|---|---|---|---|
| Clay | 1064749537426523875 | image | /home/alex/Documents/Pinterest/clay/1064749537426523875.png | ceramic, brush holder, blue and white, porcelain, face sculpture, paintbrushes, pink, artist desk, handmade, Clay, the c |
| Clay | 1064749537426523843 | image | /home/alex/Documents/Pinterest/clay/1064749537426523843.jpg | ceramic, phone stand, amplifier, horn, rust red, glazed, cozy living room, wood table, handmade, Clay, a cell phone is p |
| Clay | 1064749537426523809 | video | /home/alex/Documents/Pinterest/clay/1064749537426523809.mp4 | polymer clay, switch plate, light switch cover, blue and white, floral, scalloped, diy tutorial, home decor, handmade, v |
| Diy gift | 1064749537426523794 | image | /home/alex/Documents/Pinterest/diy-gift/1064749537426523794.png | clay, sunglasses holder, flower, sage green, wearable, lapel, black denim, mustard knit, diy gift, accessory, Diy gift,  |
| Diy gift | 1064749537426523784 | image | /home/alex/Documents/Pinterest/diy-gift/1064749537426523784.jpg | ceramic buttons, wearable ceramics, fruit, fig, apple, pomegranate, white linen shirt, handmade, red and cream, typewrit |

## Skipped

(none)

## Deleted

Rejected files, each removed by one guarded os.remove inside the Pinterest folder:

(none)

Staging copies replaced by their clean re-encode: 4

## Driver notes

- Skipped pin 1064749537426523828 (diy-gift): helper resolved it via requests and reported 'page source did not mention the pin id', so the media source may belong to another pin.
- Boards stopped at the 3-pin limit (max 3) and did not reach their end, so complete is false. Helper returned 16 pins per board; only the first 3 of each were used.

## Catalogue

- Table: lessons__pinterest_media
- Rows added: 5
- Rows failed: 0
- Search: lessons find lessons__pinterest_media <words>

## Limits

- Images were decoded and re-encoded, so no foreign bytes survive.
- Videos were scanned by ClamAV and checked by GStreamer, not re-encoded.
- No Pinterest or [removed] link is stored in the folder, the table or this report.
