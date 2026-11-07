# Pinterest capture report

## Stopped at preflight

- clamscan missing. Fix: sudo apt install clamav
- ClamAV signatures missing in /var/lib/clamav. Fix: Wait for the clamav-freshclam service to finish its first download, then check again.

No media was fetched in this run.

## Catalogue

- No rows were added in this run.
- Search: lessons find lessons__pinterest_media <words>

## Limits

- Images were decoded and re-encoded, so no foreign bytes survive.
- Videos were scanned by ClamAV and checked by GStreamer, not re-encoded.
- No Pinterest or [removed] link is stored in the folder, the table or this report.
