package br.com.fatec.fatecrooms.controller;

import br.com.fatec.fatecrooms.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService configService;

    // ─────────────────────────────────────────────
    //  Prazo mínimo de antecedência
    // ─────────────────────────────────────────────

    @GetMapping("/booking/min-advance-days")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<Map<String, Object>> getMinAdvanceDays() {
        int days = configService.getMinAdvanceDays();
        return ResponseEntity.ok(Map.of(
                "key",         SystemConfigService.KEY_MIN_ADVANCE_DAYS,
                "days",        days,
                "description", "Número mínimo de dias de antecedência para criação de reservas."
        ));
    }

    @PutMapping("/booking/min-advance-days")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<Map<String, Object>> setMinAdvanceDays(@RequestBody Map<String, Integer> body) {
        Integer days = body.get("days");
        if (days == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Campo 'days' é obrigatório."));
        }
        configService.setMinAdvanceDays(days);
        return ResponseEntity.ok(Map.of(
                "message", "Prazo mínimo atualizado com sucesso.",
                "days",    days
        ));
    }

    // ─────────────────────────────────────────────
    //  Suspensão de reservas por professores
    // ─────────────────────────────────────────────

    /**
     * GET /api/config/booking/suspend-teacher-bookings
     * Retorna o estado atual da suspensão de reservas para professores.
     * Apenas coordenadores podem consultar.
     */
    @GetMapping("/booking/suspend-teacher-bookings")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<Map<String, Object>> getSuspendTeacherBookings() {
        boolean suspended = configService.isTeacherBookingSuspended();
        return ResponseEntity.ok(Map.of(
                "key",         SystemConfigService.KEY_SUSPEND_TEACHER_BOOKINGS,
                "suspended",   suspended,
                "description", "Quando ativo, professores não podem criar novas reservas (modo planejamento)."
        ));
    }

    /**
     * PUT /api/config/booking/suspend-teacher-bookings
     * Ativa ou desativa a suspensão de reservas para professores.
     * Body: { "suspended": true } ou { "suspended": false }
     * Apenas coordenadores podem alterar.
     */
    @PutMapping("/booking/suspend-teacher-bookings")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<Map<String, Object>> setSuspendTeacherBookings(
            @RequestBody Map<String, Boolean> body) {

        Boolean suspended = body.get("suspended");
        if (suspended == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Campo 'suspended' (boolean) é obrigatório."));
        }

        configService.setTeacherBookingSuspended(suspended);

        String msg = suspended
                ? "Reservas de professores suspensas. Sistema em modo de planejamento."
                : "Reservas de professores reativadas.";

        return ResponseEntity.ok(Map.of(
                "message",   msg,
                "suspended", suspended
        ));
    }
}