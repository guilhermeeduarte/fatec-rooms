package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.PasswordChangeConfirmDTO;
import br.com.fatec.fatecrooms.DTO.PasswordChangeRequestDTO;
import br.com.fatec.fatecrooms.DTO.UpdateAuthLevelRequest;
import br.com.fatec.fatecrooms.DTO.UpdateProfileRequest;
import br.com.fatec.fatecrooms.DTO.UserSummaryDTO;
import br.com.fatec.fatecrooms.exception.BusinessException;
import br.com.fatec.fatecrooms.exception.ResourceNotFoundException;
import br.com.fatec.fatecrooms.model.PasswordResetToken;
import br.com.fatec.fatecrooms.model.User;
import br.com.fatec.fatecrooms.repository.PasswordResetTokenRepository;
import br.com.fatec.fatecrooms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final int TOKEN_EXPIRY_MINUTES = 30;

    // ─────────────────────────────────────────────
    //  ATUALIZAÇÃO DE PERFIL (nome, email)
    // ─────────────────────────────────────────────

    /**
     * Atualiza firstname, lastname, email e displayname do próprio usuário.
     * A senha NÃO é alterada aqui — use o fluxo de reset por e-mail.
     */
    @Transactional
    public UserSummaryDTO updateProfile(String username, UpdateProfileRequest request) {
        User user = getUserByUsernameOrThrow(username);

        // Verifica se o novo e-mail já está em uso por outro usuário
        if (!user.getEmail().equalsIgnoreCase(request.getEmail())) {
            boolean emailTaken = userRepository.existsByEmail(request.getEmail());
            if (emailTaken) {
                throw new BusinessException("Este e-mail já está em uso por outra conta.");
            }
        }

        user.setFirstname(request.getFirstname().trim());
        user.setLastname(request.getLastname().trim());
        user.setEmail(request.getEmail().trim());

        String displayname = (request.getDisplayname() != null && !request.getDisplayname().isBlank())
                ? request.getDisplayname().trim()
                : request.getFirstname().trim() + " " + request.getLastname().trim();
        user.setDisplayname(displayname);

        userRepository.save(user);
        return toSummary(user);
    }

    // ─────────────────────────────────────────────
    //  RESET DE SENHA POR E-MAIL
    // ─────────────────────────────────────────────

    /**
     * Passo 1 — Usuário solicita reset.
     * Gera token seguro, persiste e dispara e-mail.
     * Sempre retorna sucesso (evita enumeração de e-mails).
     */
    @Transactional
    public void requestPasswordReset(PasswordChangeRequestDTO request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            // Remove tokens anteriores do usuário para evitar acúmulo
            tokenRepository.deleteAllByUserId(user.getId());

            String rawToken = generateSecureToken();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setToken(rawToken);
            resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES));
            resetToken.setUsed(false);
            tokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(user.getEmail(), rawToken);
        });
        // Se o e-mail não existir, retorna silenciosamente (segurança)
    }

    /**
     * Passo 2 — Usuário confirma com token + nova senha.
     */
    @Transactional
    public void confirmPasswordReset(PasswordChangeConfirmDTO request) {
        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new BusinessException("Token inválido ou expirado."));

        if (resetToken.isUsed()) {
            throw new BusinessException("Este token já foi utilizado.");
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Token expirado. Solicite um novo link de redefinição.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        log.info("Senha redefinida com sucesso para o usuário: {}", user.getUsername());
    }

    // ─────────────────────────────────────────────
    //  ALTERAÇÃO DE AUTHLEVEL (apenas coordenador)
    // ─────────────────────────────────────────────

    /**
     * Coordenador altera o nível de acesso de qualquer usuário ativo.
     * Não é possível alterar o próprio authlevel (evita auto-promoção/rebaixamento).
     */
    @Transactional
    public UserSummaryDTO updateAuthLevel(String coordinatorUsername, Integer targetUserId, UpdateAuthLevelRequest request) {
        User coordinator = getUserByUsernameOrThrow(coordinatorUsername);
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + targetUserId));

        if (coordinator.getId().equals(target.getId())) {
            throw new BusinessException("Você não pode alterar o seu próprio nível de acesso.");
        }

        if (target.getEnabled() == 0) {
            throw new BusinessException("Não é possível alterar o authlevel de um usuário desabilitado ou pendente.");
        }

        byte newLevel = request.getAuthlevel();
        if (newLevel != 1 && newLevel != 2) {
            throw new BusinessException("Nível de acesso inválido. Use 1 (coordenador) ou 2 (professor).");
        }

        target.setAuthlevel(newLevel);
        userRepository.save(target);

        String role = newLevel == 1 ? "Coordenador" : "Professor";
        log.info("Authlevel do usuário '{}' alterado para {} pelo coordenador '{}'",
                target.getUsername(), role, coordinator.getUsername());

        return toSummary(target);
    }

    // ─────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────

    private User getUserByUsernameOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + username));
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private UserSummaryDTO toSummary(User u) {
        return new UserSummaryDTO(
                u.getId(), u.getUsername(), u.getFirstname(),
                u.getLastname(), u.getEmail(), u.getAuthlevel(), u.getEnabled()
        );
    }
}