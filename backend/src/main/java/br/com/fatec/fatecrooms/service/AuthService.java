package br.com.fatec.fatecrooms.service;

import br.com.fatec.fatecrooms.DTO.*;
import br.com.fatec.fatecrooms.model.User;
import br.com.fatec.fatecrooms.repository.PasswordResetTokenRepository;
import br.com.fatec.fatecrooms.repository.UserRepository;
import br.com.fatec.fatecrooms.security.JwtService;
import br.com.fatec.fatecrooms.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository               userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder              passwordEncoder;
    private final JwtService                   jwtService;
    private final AuthenticationManager        authenticationManager;
    private final UserDetailsServiceImpl       userDetailsService;

    @Transactional
    public String register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername()))
            throw new IllegalArgumentException("Username já está em uso.");
        if (userRepository.existsByEmail(request.getEmail()))
            throw new IllegalArgumentException("E-mail já está em uso.");

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstname(request.getFirstname());
        user.setLastname(request.getLastname());
        user.setEmail(request.getEmail());
        user.setDisplayname(
                request.getDisplayname() != null
                        ? request.getDisplayname()
                        : request.getFirstname() + " " + request.getLastname()
        );
        user.setExt(request.getExt());
        user.setDepartmentId(request.getDepartmentId());
        user.setAuthlevel((byte) 0);
        user.setEnabled((byte) 0);
        user.setCreated(LocalDateTime.now());

        userRepository.save(user);
        return "Cadastro realizado com sucesso! Aguarde a aprovação de um coordenador.";
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Usuário ou senha inválidos."));

        if (user.getEnabled() == 0) {
            if (user.getAuthlevel() == 0) {
                throw new DisabledException("Seu cadastro ainda não foi aprovado por um coordenador. Aguarde aprovação antes de entrar.");
            } else {
                throw new DisabledException("Sua conta está desativada. Entre em contato com o coordenador para reativá-la.");
            }
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        // Invalida qualquer token de reset pendente ao fazer login com sucesso
        tokenRepository.deleteAllByUserId(user.getId());

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtService.generateToken(userDetails);

        user.setLastlogin(LocalDateTime.now());
        userRepository.save(user);

        return new AuthResponse(token, user.getUsername(), user.getAuthlevel(), "Login realizado com sucesso.");
    }
}