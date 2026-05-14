// Re-export from consolidated entities file (backward compat)
// Old table name was 'chargers' - booking_db.sql uses 'charger_read_models'
export { ChargerReadModelOrmEntity as ChargerOrmEntity } from './booking.orm-entities';
