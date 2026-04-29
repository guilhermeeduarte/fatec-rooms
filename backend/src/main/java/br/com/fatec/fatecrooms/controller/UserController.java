package br.com.fatec.fatecrooms.controller;

import br.com.fatec.fatecrooms.DTO.PasswordChangeConfirmDTO;
import br.com.fatec.fatecrooms.DTO.PasswordChangeRequestDTO;
import br.com.fatec.fatecrooms.DTO.UpdateProfileRequest;
import br.com.fatec.fatecrooms.DTO.UserSummaryDTO;
import br.com.fatec.fatecrooms.model.User;
import br.com.fatec.fatecrooms.repository.UserRepository;
import br.com.fatec.fatecrooms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserSummaryDTO> me(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

        return ResponseEntity.ok(new UserSummaryDTO(
                user.getId(),
                user.getUsername(),
                user.getFirstname(),
                user.getLastname(),
                user.getEmail(),
                user.getAuthlevel(),
                user.getEnabled()
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<UserSummaryDTO> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), request));
    }

    /**
     * Envia e-mail com token de redefinição.
     * Não exige autenticação(usuário não precisa estar logado).
     * Sempre retorna 200 para não vazar se o e-mail existe ou não.
     */
    @PostMapping("/password/request")
    public ResponseEntity<Map<String, String>> requestPasswordReset(
            @Valid @RequestBody PasswordChangeRequestDTO request) {
        userService.requestPasswordReset(request);
        return ResponseEntity.ok(Map.of(
                "message", "Se o e-mail informado estiver cadastrado, você receberá um link de redefinição em breve."
        ));
    }

    @PostMapping("/password/confirm")
    public ResponseEntity<Map<String, String>> confirmPasswordReset(
            @Valid @RequestBody PasswordChangeConfirmDTO request) {
        userService.confirmPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "Senha redefinida com sucesso. Faça login com sua nova senha."));
    }
}