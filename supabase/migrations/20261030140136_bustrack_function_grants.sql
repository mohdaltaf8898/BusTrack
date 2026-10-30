-- Supabase may grant function EXECUTE explicitly to anon/authenticated by default.
-- PUBLIC-only revocation does not remove those direct role grants.
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.start_driver_trip(text, text) from public, anon;
revoke all on function public.end_driver_trip(uuid) from public, anon;
revoke all on function public.set_trip_location_sharing(uuid, boolean) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.submit_bus_location(uuid, double precision, double precision, numeric, numeric, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.start_driver_trip(text, text) to authenticated;
grant execute on function public.end_driver_trip(uuid) to authenticated;
grant execute on function public.set_trip_location_sharing(uuid, boolean) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
-- Trigger-only functions are not directly callable by browser roles.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_escalation() from public, anon, authenticated;
revoke all on function public.validate_driver_assignment() from public, anon, authenticated;
revoke all on function public.invalidate_route_geometry_after_stop_change() from public, anon, authenticated;
