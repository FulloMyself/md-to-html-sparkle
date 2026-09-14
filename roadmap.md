# Northgate build roadmap

## Done
- Backend: estates, units, residents, gates, vehicles, visitor passes, parking bays, access events, devices
- Roles: resident, security guard, estate manager, super admin (separate roles table + access rules)
- Sign up / sign in with email + password and Google
- Join an estate with a code (resident / security / manager codes)
- Resident: register vehicles, invite visitors with a time window
- Security console: simulate plate reads, live activity feed, manual override, gates, bays, device health
- Estate setup: join codes, people, units, gates, bays, devices

## Next
- Notifications to residents when a visitor arrives or a vehicle is held
- Real camera endpoint (public API) posting plate reads instead of the simulator
- Per-estate switching for super admins managing several estates
- Audit trail export and reporting
- Offline behaviour at the gate (queued reads, sync on reconnect)
