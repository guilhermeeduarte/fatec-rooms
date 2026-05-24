-- V16__reestrutura_cursos_e_turmas.sql

-- ── 1. Atualiza enum de shift ─────────────────────────────────────────────────
ALTER TABLE class_groups
    MODIFY COLUMN shift ENUM('MORNING','AFTERNOON','EVENING','YEAR_1','YEAR_2') NOT NULL;

-- ── 2. Adiciona is_annual em courses ──────────────────────────────────────────
ALTER TABLE courses
    ADD COLUMN is_annual TINYINT UNSIGNED NOT NULL DEFAULT 0
        COMMENT '1 = curso anual (ex: AMS)'
    AFTER has_saturday;

-- ── 3. Remove dados dependentes na ordem correta ──────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM recurring_booking_instances;
DELETE FROM recurring_booking_periods;
DELETE FROM recurring_bookings;
DELETE FROM booking_periods;
DELETE FROM bookings;
DELETE FROM class_groups;
DELETE FROM courses;
SET FOREIGN_KEY_CHECKS = 1;

-- ── 4. Insere cursos corretos ─────────────────────────────────────────────────
INSERT INTO courses (name, abbreviation, has_saturday, is_annual, active) VALUES
                                                                              ('Comércio Exterior',                              'COMEX', 0, 0, 1),
                                                                              ('Análise e Desenvolvimento de Sistemas',          'ADS',   1, 0, 1),
                                                                              ('Desenvolvimento de Software Multiplataforma',    'DSM',   1, 0, 1),
                                                                              ('Gestão de Recursos Humanos',                     'RH',    0, 0, 1),
                                                                              ('Gestão Empresarial',                             'GE',    0, 0, 1),
                                                                              ('Logística',                                      'LOG',   0, 0, 1),
                                                                              ('Polímeros',                                      'POL',   0, 0, 1),
                                                                              ('Desenvolvimento de Produtos Plásticos',          'DPP',   0, 0, 1),
                                                                              ('AMS – Análise e Desenvolvimento de Sistemas',    'AMS',   0, 1, 1);

-- ── 5. Cria tabela de turnos permitidos por curso ─────────────────────────────
CREATE TABLE IF NOT EXISTS course_allowed_shifts (
                                                     course_id INT UNSIGNED NOT NULL,
                                                     shift     ENUM('MORNING','AFTERNOON','EVENING','YEAR_1','YEAR_2') NOT NULL,
    PRIMARY KEY (course_id, shift),
    CONSTRAINT fk_cas_course FOREIGN KEY (course_id)
    REFERENCES courses(course_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO course_allowed_shifts (course_id, shift)
SELECT c.course_id, s.shift
FROM courses c
         JOIN (
    SELECT 'COMEX' AS abbr, 'MORNING'   AS shift UNION ALL
    SELECT 'COMEX',          'AFTERNOON'          UNION ALL
    SELECT 'ADS',            'AFTERNOON'          UNION ALL
    SELECT 'ADS',            'EVENING'            UNION ALL
    SELECT 'DSM',            'MORNING'            UNION ALL
    SELECT 'RH',             'MORNING'            UNION ALL
    SELECT 'GE',             'MORNING'            UNION ALL
    SELECT 'LOG',            'MORNING'            UNION ALL
    SELECT 'LOG',            'EVENING'            UNION ALL
    SELECT 'POL',            'EVENING'            UNION ALL
    SELECT 'DPP',            'EVENING'            UNION ALL
    SELECT 'AMS',            'YEAR_1'             UNION ALL
    SELECT 'AMS',            'YEAR_2'
) s ON c.abbreviation = s.abbr;

-- ── 6. Gera class_groups: cursos semestrais (6 semestres × turnos) ────────────
INSERT INTO class_groups (course_id, course_semester, shift, has_saturday, label, active)
SELECT
    c.course_id,
    sem.n,
    cas.shift,
    c.has_saturday,
    CONCAT(
            sem.n, 'º ', c.abbreviation, ' ',
            CASE cas.shift
                WHEN 'MORNING'   THEN 'Manhã'
                WHEN 'AFTERNOON' THEN 'Tarde'
                WHEN 'EVENING'   THEN 'Noite'
                END
    ),
    1
FROM courses c
         JOIN course_allowed_shifts cas ON cas.course_id = c.course_id
         CROSS JOIN (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3
    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) sem
WHERE c.is_annual = 0;

-- ── 7. Gera class_groups para AMS (YEAR_1 e YEAR_2) ──────────────────────────
INSERT INTO class_groups (course_id, course_semester, shift, has_saturday, label, active)
SELECT
    c.course_id,
    CASE cas.shift WHEN 'YEAR_1' THEN 1 ELSE 2 END,
    cas.shift,
    0,
    CONCAT(
            c.abbreviation, ' ',
            CASE cas.shift WHEN 'YEAR_1' THEN '1º Ano' ELSE '2º Ano' END,
            ' Noturno'
    ),
    1
FROM courses c
         JOIN course_allowed_shifts cas ON cas.course_id = c.course_id
WHERE c.is_annual = 1;