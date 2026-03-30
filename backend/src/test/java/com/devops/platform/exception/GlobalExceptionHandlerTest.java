package com.devops.platform.exception;

import com.devops.platform.dto.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@DisplayName("GlobalExceptionHandler Unit Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("should handle BadCredentialsException with 401")
    void shouldHandleBadCredentials() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleBadCredentials(new BadCredentialsException("Bad credentials"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid username or password");
    }

    @Test
    @DisplayName("should handle UsernameNotFoundException with 404")
    void shouldHandleUserNotFound() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleUserNotFound(new UsernameNotFoundException("User not found: admin"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("User not found");
    }

    @Test
    @DisplayName("should handle IllegalArgumentException with 400")
    void shouldHandleIllegalArgument() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleIllegalArgument(new IllegalArgumentException("Username is already taken"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Username is already taken");
    }

    @Test
    @DisplayName("should handle MethodArgumentNotValidException with field errors")
    void shouldHandleValidationErrors() {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult("target", "testObject");
        bindingResult.addError(new FieldError("testObject", "username", "must not be blank"));
        bindingResult.addError(new FieldError("testObject", "email", "must be a valid email"));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ApiResponse<Map<String, String>>> response = handler.handleValidation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Validation failed");
        assertThat(response.getBody().getData()).containsKeys("username", "email");
    }

    @Test
    @DisplayName("should handle generic Exception with 500")
    void shouldHandleGenericException() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleGeneral(new RuntimeException("Something unexpected"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("An unexpected error occurred");
    }
}
