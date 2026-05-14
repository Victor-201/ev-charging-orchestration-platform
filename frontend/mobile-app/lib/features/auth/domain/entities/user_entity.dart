import 'package:equatable/equatable.dart';

/// Entity người dùng từ IAM Service
class UserEntity extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final DateTime? dateOfBirth;
  final String role;
  final bool mfaEnabled;
  final bool hasArrears;

  const UserEntity({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    this.dateOfBirth,
    required this.role,
    required this.mfaEnabled,
    required this.hasArrears,
  });

  @override
  List<Object?> get props => [
        id,
        email,
        fullName,
        phone,
        dateOfBirth,
        role,
        mfaEnabled,
        hasArrears,
      ];
}
