package br.com.fatec.fatecrooms.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "O nome é obrigatório.")
    private String firstname;

    @NotBlank(message = "O sobrenome é obrigatório.")
    private String lastname;

    @Email(message = "E-mail inválido.")
    @NotBlank(message = "O e-mail é obrigatório.")
    private String email;

    private String displayname;
}