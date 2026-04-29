package br.com.fatec.fatecrooms.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordChangeConfirmDTO {

    @NotBlank(message = "O token é obrigatório.")
    private String token;

    @NotBlank(message = "A nova senha é obrigatória.")
    @Size(min = 6, message = "A senha deve ter ao menos 6 caracteres.")
    private String newPassword;
}