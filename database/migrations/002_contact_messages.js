// Messages sent through the public contact form, managed from the admin dashboard.
exports.id = '002_contact_messages';

exports.up = async function up(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS contact_messages (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL,
    topic      VARCHAR(100) NOT NULL,
    message    TEXT NOT NULL,
    status     ENUM('new','read','resolved') NOT NULL DEFAULT 'new',
    user_id    BIGINT UNSIGNED NULL,
    ip         VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_contact_status (status, created_at),
    CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`);
};
