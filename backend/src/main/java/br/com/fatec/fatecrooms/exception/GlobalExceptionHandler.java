package br.com.fatec.fatecrooms.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404 ──────────────────────────────────────────────────────────────────
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new ApiError(HttpStatus.NOT_FOUND.value(), "Not Found", ex.getMessage()));
    }

    // ── 400 — regras de negócio (mensagem controlada, segura para expor) ─────
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> handleBusiness(BusinessException ex) {
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.getMessage()));
    }

    // ── 400 — IllegalArgument / IllegalState: loga internamente, retorna genérico ──
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("IllegalArgumentException: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad Request",
                        "Requisição inválida. Verifique os dados enviados."));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(IllegalStateException ex) {
        log.warn("IllegalStateException: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad Request",
                        "Operação não permitida no estado atual."));
    }

    // ── 400 — Validação @Valid ────────────────────────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Validation Failed",
                        "Um ou mais campos são inválidos.", details));
    }

    // ── 400 — ConstraintViolation ─────────────────────────────────────────────
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex) {
        List<String> details = ex.getConstraintViolations().stream()
                .map(cv -> cv.getPropertyPath() + ": " + cv.getMessage())
                .toList();
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Validation Failed",
                        "Um ou mais campos são inválidos.", details));
    }

    // ── 400 — Parâmetro ausente ───────────────────────────────────────────────
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad Request",
                        "Parâmetro obrigatório ausente: " + ex.getParameterName()));
    }

    // ── 400 — Tipo errado em parâmetro ───────────────────────────────────────
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String expected = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "desconhecido";
        return ResponseEntity.badRequest().body(
                new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad Request",
                        "Parâmetro '" + ex.getName() + "' inválido. Tipo esperado: " + expected));
    }

    // ── 401 ──────────────────────────────────────────────────────────────────
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                new ApiError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized", ex.getMessage()));
    }

    // ── 403 ──────────────────────────────────────────────────────────────────
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiError> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ApiError(HttpStatus.FORBIDDEN.value(), "Forbidden", ex.getMessage()));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiError> handleLocked(LockedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ApiError(HttpStatus.FORBIDDEN.value(), "Forbidden",
                        "Sua conta está bloqueada. Entre em contato com o administrador."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ApiError(HttpStatus.FORBIDDEN.value(), "Forbidden",
                        "Você não tem permissão para acessar este recurso."));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiError> handleSecurity(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ApiError(HttpStatus.FORBIDDEN.value(), "Forbidden", ex.getMessage()));
    }

    // ── 500 — loga o erro real, retorna mensagem genérica ────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new ApiError(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal Server Error",
                        "Ocorreu um erro inesperado. Tente novamente mais tarde."));
    }
}