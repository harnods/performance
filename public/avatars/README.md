# Employee avatars

Drop portrait images here. They are served at `/avatars/<file>` and referenced
by the `photo` field in `utils/employees.ts`.

Expected files (JPG; square images look best, e.g. 200×200):

- agung.jpg
- alfian.jpg
- ali.jpg
- andi.jpg
- bayu.jpg
- citra.jpg
- dewi.jpg
- eko.jpg
- fitri.jpg
- gilang.jpg

If a file is missing, the avatar falls back to coloured initials automatically.
To use a different filename or extension (e.g. .png), update the matching
`photo:` path in `utils/employees.ts`.
