const fs = require('fs');
const path = require('path');

const SEEDS_DIR = path.join(__dirname, '..', 'database', 'seeds');

// ── Vietnamese administrative data ──────────────────────────────────────────
const CITIES = [
  { uuid: 'cccccccc-0000-4000-8000-000000000001', name: 'Hà Nội', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000002', name: 'Hải Phòng', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000003', name: 'Bắc Ninh', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000004', name: 'Hưng Yên', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000005', name: 'Hải Dương', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000006', name: 'Nam Định', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000007', name: 'Thái Bình', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000008', name: 'Hà Nam', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000009', name: 'Quảng Ninh', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000010', name: 'Lạng Sơn', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000011', name: 'Bắc Giang', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000012', name: 'Thái Nguyên', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000013', name: 'Lào Cai', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000014', name: 'Hòa Bình', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000015', name: 'Sơn La', region: 'Miền Bắc' },
  { uuid: 'cccccccc-0000-4000-8000-000000000016', name: 'Thanh Hóa', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000017', name: 'Nghệ An', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000018', name: 'Thừa Thiên Huế', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000019', name: 'Hà Tĩnh', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000020', name: 'Quảng Bình', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000021', name: 'Quảng Trị', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000022', name: 'Đà Nẵng', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000023', name: 'Khánh Hòa', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000024', name: 'Quảng Nam', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000025', name: 'Bình Thuận', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000026', name: 'Bình Định', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000027', name: 'Phú Yên', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000028', name: 'Quảng Ngãi', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000029', name: 'Lâm Đồng', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000030', name: 'Đắk Lắk', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000031', name: 'Gia Lai', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000032', name: 'Đắk Nông', region: 'Miền Trung' },
  { uuid: 'cccccccc-0000-4000-8000-000000000033', name: 'TP. Hồ Chí Minh', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000034', name: 'Bình Dương', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000035', name: 'Đồng Nai', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000036', name: 'Bà Rịa - Vũng Tàu', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000037', name: 'Tây Ninh', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000038', name: 'Bình Phước', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000039', name: 'Cần Thơ', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000040', name: 'Long An', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000041', name: 'Tiền Giang', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000042', name: 'Kiên Giang', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000043', name: 'An Giang', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000044', name: 'Vĩnh Long', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000045', name: 'Đồng Tháp', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000046', name: 'Bến Tre', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000047', name: 'Hậu Giang', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000048', name: 'Sóc Trăng', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000049', name: 'Trà Vinh', region: 'Miền Nam' },
  { uuid: 'cccccccc-0000-4000-8000-000000000050', name: 'Bạc Liêu', region: 'Miền Nam' },
];

const cityMap = Object.fromEntries(CITIES.map(c => [c.name, c]));

const DISTRICTS = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Tây Hồ', 'Hà Đông', 'Sóc Sơn', 'Đông Anh', 'Gia Lâm', 'Thanh Trì'],
  'Hải Phòng': ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Kiến An', 'Hải An', 'Đồ Sơn', 'Dương Kinh', 'An Dương', 'Thủy Nguyên', 'An Lão'],
  'Bắc Ninh': ['Bắc Ninh', 'Từ Sơn', 'Yên Phong', 'Quế Võ', 'Tiên Du', 'Gia Bình', 'Lương Tài', 'Thuận Thành'],
  'Hưng Yên': ['Hưng Yên', 'Mỹ Hào', 'Văn Lâm', 'Văn Giang', 'Khoái Châu', 'Kim Động', 'Ân Thi', 'Phù Cừ', 'Tiên Lữ'],
  'Hải Dương': ['Hải Dương', 'Chí Linh', 'Nam Sách', 'Kinh Môn', 'Gia Lộc', 'Tứ Kỳ', 'Thanh Miện', 'Ninh Giang', 'Cẩm Giàng', 'Thanh Hà'],
  'Nam Định': ['Nam Định', 'Mỹ Lộc', 'Vụ Bản', 'Ý Yên', 'Nghĩa Hưng', 'Nam Trực', 'Trực Ninh', 'Xuân Trường', 'Giao Thủy', 'Hải Hậu'],
  'Thái Bình': ['Thái Bình', 'Quỳnh Phụ', 'Hưng Hà', 'Đông Hưng', 'Thái Thụy', 'Tiền Hải', 'Kiến Xương', 'Vũ Thư'],
  'Hà Nam': ['Phủ Lý', 'Duy Tiên', 'Kim Bảng', 'Lý Nhân', 'Thanh Liêm', 'Bình Lục'],
  'Quảng Ninh': ['Hạ Long', 'Cẩm Phả', 'Uông Bí', 'Móng Cái', 'Quảng Yên', 'Đông Triều', 'Hoành Bồ', 'Vân Đồn', 'Cô Tô', 'Tiên Yên'],
  'Lạng Sơn': ['Lạng Sơn', 'Tràng Định', 'Bình Gia', 'Văn Lãng', 'Cao Lộc', 'Văn Quan', 'Bắc Sơn', 'Hữu Lũng', 'Chi Lăng', 'Lộc Bình'],
  'Bắc Giang': ['Bắc Giang', 'Việt Yên', 'Hiệp Hòa', 'Tân Yên', 'Lạng Giang', 'Yên Dũng', 'Lục Nam', 'Lục Ngạn', 'Sơn Động'],
  'Thái Nguyên': ['Thái Nguyên', 'Sông Công', 'Phổ Yên', 'Phú Bình', 'Đồng Hỷ', 'Võ Nhai', 'Định Hóa', 'Đại Từ'],
  'Lào Cai': ['Lào Cai', 'Sa Pa', 'Bát Xát', 'Mường Khương', 'Si Ma Cai', 'Bắc Hà', 'Bảo Thắng', 'Bảo Yên', 'Văn Bàn'],
  'Hòa Bình': ['Hòa Bình', 'Lương Sơn', 'Kim Bôi', 'Cao Phong', 'Đà Bắc', 'Tân Lạc', 'Mai Châu', 'Lạc Sơn', 'Yên Thủy'],
  'Sơn La': ['Sơn La', 'Mộc Châu', 'Thuận Châu', 'Mường La', 'Bắc Yên', 'Phù Yên', 'Mai Sơn', 'Sông Mã', 'Sốp Cộp'],
  'Thanh Hóa': ['Thanh Hóa', 'Sầm Sơn', 'Bỉm Sơn', 'Nghi Sơn', 'Đông Sơn', 'Quảng Xương', 'Hoằng Hóa', 'Hậu Lộc', 'Nga Sơn', 'Hà Trung', 'Vĩnh Lộc', 'Thạch Thành', 'Cẩm Thủy', 'Bá Thước', 'Lang Chánh', 'Ngọc Lặc'],
  'Nghệ An': ['Vinh', 'Cửa Lò', 'Thái Hòa', 'Hoàng Mai', 'Diễn Châu', 'Quỳnh Lưu', 'Nghi Lộc', 'Đô Lương', 'Anh Sơn', 'Tân Kỳ', 'Con Cuông', 'Tương Dương', 'Kỳ Sơn'],
  'Thừa Thiên Huế': ['Huế', 'Hương Thủy', 'Hương Trà', 'Phong Điền', 'Quảng Điền', 'Phú Vang', 'Phú Lộc', 'A Lưới', 'Nam Đông'],
  'Hà Tĩnh': ['Hà Tĩnh', 'Hồng Lĩnh', 'Kỳ Anh', 'Cẩm Xuyên', 'Thạch Hà', 'Can Lộc', 'Nghi Xuân', 'Đức Thọ', 'Hương Sơn', 'Hương Khê'],
  'Quảng Bình': ['Đồng Hới', 'Ba Đồn', 'Quảng Trạch', 'Bố Trạch', 'Tuyên Hóa', 'Minh Hóa', 'Lệ Thủy', 'Quảng Ninh'],
  'Quảng Trị': ['Đông Hà', 'Quảng Trị', 'Vĩnh Linh', 'Cam Lộ', 'Triệu Phong', 'Hải Lăng', 'Gio Linh', 'Hướng Hóa', 'Đa Krông'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'],
  'Khánh Hòa': ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Vạn Ninh', 'Diên Khánh', 'Khánh Vĩnh', 'Cam Lâm'],
  'Quảng Nam': ['Tam Kỳ', 'Hội An', 'Điện Bàn', 'Duy Xuyên', 'Quế Sơn', 'Hiệp Đức', 'Thăng Bình', 'Núi Thành', 'Tiên Phước', 'Phước Sơn', 'Bắc Trà My', 'Nam Trà My', 'Phú Ninh'],
  'Bình Thuận': ['Phan Thiết', 'La Gi', 'Tuy Phong', 'Bắc Bình', 'Hàm Thuận Bắc', 'Hàm Thuận Nam', 'Hàm Tân', 'Đức Linh', 'Tánh Linh', 'Phú Quý'],
  'Bình Định': ['Quy Nhơn', 'An Nhơn', 'Hoài Nhơn', 'Tuy Phước', 'Phù Cát', 'Phù Mỹ', 'Hoài Ân', 'An Lão', 'Vân Canh', 'Vĩnh Thạnh'],
  'Phú Yên': ['Tuy Hòa', 'Sông Cầu', 'Đông Hòa', 'Tây Hòa', 'Phú Hòa', 'Sơn Hòa', 'Sông Hinh', 'Đồng Xuân'],
  'Quảng Ngãi': ['Quảng Ngãi', 'Bình Sơn', 'Sơn Tịnh', 'Tư Nghĩa', 'Nghĩa Hành', 'Mộ Đức', 'Đức Phổ', 'Ba Tơ', 'Sơn Hà', 'Trà Bồng', 'Lý Sơn'],
  'Lâm Đồng': ['Đà Lạt', 'Bảo Lộc', 'Đức Trọng', 'Di Linh', 'Đơn Dương', 'Lạc Dương', 'Đạ Tẻh', 'Cát Tiên', 'Lâm Hà', 'Bảo Lâm'],
  'Đắk Lắk': ['Buôn Ma Thuột', 'Buôn Hồ', 'Ea Hleo', 'Krông Năng', 'Cư Mgar', 'Ea Kar', 'MĐrắk', 'Krông Bông', 'Krông Pắc', 'Lắk', 'Buôn Đôn', 'Cư Kuin'],
  'Gia Lai': ['Pleiku', 'An Khê', 'Ayun Pa', 'Đăk Đoa', 'Mang Yang', 'Chư Păh', 'Chư Sê', 'Chư Prông', 'Krông Pa', 'Ia Grai', 'Phú Thiện'],
  'Đắk Nông': ['Gia Nghĩa', 'Đăk Mil', 'Đăk Song', 'Đăk RLấp', 'Tuy Đức', 'Krông Nô', 'Cư Jút'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Thủ Đức', 'Củ Chi', 'Hóc Môn', 'Bình Chánh', 'Nhà Bè', 'Cần Giờ'],
  'Bình Dương': ['Thủ Dầu Một', 'Thuận An', 'Dĩ An', 'Bến Cát', 'Tân Uyên', 'Phú Giáo', 'Bắc Tân Uyên', 'Dầu Tiếng', 'Bàu Bàng'],
  'Đồng Nai': ['Biên Hòa', 'Long Khánh', 'Vĩnh Cửu', 'Định Quán', 'Tân Phú', 'Thống Nhất', 'Cẩm Mỹ', 'Long Thành', 'Xuân Lộc', 'Nhơn Trạch', 'Trảng Bom'],
  'Bà Rịa - Vũng Tàu': ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Long Điền', 'Đất Đỏ', 'Xuyên Mộc', 'Châu Đức', 'Côn Đảo'],
  'Tây Ninh': ['Tây Ninh', 'Trảng Bàng', 'Hòa Thành', 'Bến Cầu', 'Gò Dầu', 'Châu Thành', 'Dương Minh Châu', 'Tân Biên', 'Tân Châu'],
  'Bình Phước': ['Đồng Xoài', 'Phước Long', 'Bình Long', 'Bù Gia Mập', 'Lộc Ninh', 'Bù Đốp', 'Hớn Quản', 'Bù Đăng', 'Đồng Phú', 'Phú Riềng'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt', 'Cờ Đỏ', 'Phong Điền', 'Vĩnh Thạnh', 'Thới Lai'],
  'Long An': ['Tân An', 'Kiến Tường', 'Bến Lức', 'Cần Đước', 'Cần Giuộc', 'Đức Hòa', 'Đức Huệ', 'Thạnh Hóa', 'Tân Trụ', 'Châu Thành', 'Mộc Hóa', 'Tân Thạnh', 'Thủ Thừa', 'Vĩnh Hưng'],
  'Tiền Giang': ['Mỹ Tho', 'Gò Công', 'Cai Lậy', 'Châu Thành', 'Chợ Gạo', 'Gò Công Tây', 'Gò Công Đông', 'Tân Phước', 'Cái Bè'],
  'Kiên Giang': ['Rạch Giá', 'Hà Tiên', 'Phú Quốc', 'Kiên Lương', 'Hòn Đất', 'Tân Hiệp', 'Châu Thành', 'Giồng Riềng', 'Gò Quao', 'An Biên', 'An Minh', 'Vĩnh Thuận', 'U Minh Thượng'],
  'An Giang': ['Long Xuyên', 'Châu Đốc', 'Tân Châu', 'Châu Phú', 'Chợ Mới', 'Phú Tân', 'Thoại Sơn', 'Tri Tôn', 'Tịnh Biên', 'An Phú'],
  'Vĩnh Long': ['Vĩnh Long', 'Bình Minh', 'Tam Bình', 'Long Hồ', 'Mang Thít', 'Vũng Liêm', 'Trà Ôn', 'Bình Tân'],
  'Đồng Tháp': ['Cao Lãnh', 'Sa Đéc', 'Hồng Ngự', 'Châu Thành', 'Lai Vung', 'Lấp Vò', 'Tam Nông', 'Tân Hồng', 'Thanh Bình', 'Tháp Mười'],
  'Bến Tre': ['Bến Tre', 'Ba Tri', 'Bình Đại', 'Châu Thành', 'Chợ Lách', 'Giồng Trôm', 'Mỏ Cày Bắc', 'Mỏ Cày Nam', 'Thạnh Phú'],
  'Hậu Giang': ['Vị Thanh', 'Ngã Bảy', 'Long Mỹ', 'Châu Thành', 'Phụng Hiệp', 'Vị Thủy'],
  'Sóc Trăng': ['Sóc Trăng', 'Vĩnh Châu', 'Ngã Năm', 'Kế Sách', 'Long Phú', 'Cù Lao Dung', 'Mỹ Tú', 'Mỹ Xuyên', 'Thạnh Trị', 'Trần Đề'],
  'Trà Vinh': ['Trà Vinh', 'Duyên Hải', 'Càng Long', 'Cầu Kè', 'Tiểu Cần', 'Châu Thành', 'Cầu Ngang', 'Trà Cú'],
  'Bạc Liêu': ['Bạc Liêu', 'Giá Rai', 'Hồng Dân', 'Phước Long', 'Vĩnh Lợi', 'Đông Hải', 'Hòa Bình'],
};

const WARDS = {
  'Hà Nội': {
    'Ba Đình': ['Phúc Xá', 'Trúc Bạch', 'Vĩnh Phúc', 'Cống Vị', 'Liễu Giai', 'Nguyễn Trung Trực'],
    'Hoàn Kiếm': ['Phúc Tân', 'Đồng Xuân', 'Hàng Mã', 'Hàng Buồm', 'Hàng Đào', 'Hàng Bồ'],
    'Hai Bà Trưng': ['Nguyễn Du', 'Bùi Thị Xuân', 'Phạm Đình Hổ', 'Lê Đại Hành', 'Đồng Nhân', 'Bạch Mai'],
    'Đống Đa': ['Láng Thượng', 'Láng Hạ', 'Khâm Thiên', 'Trung Liệt', 'Kim Liên', 'Ô Chợ Dừa'],
    'Cầu Giấy': ['Nghĩa Tân', 'Nghĩa Đô', 'Quan Hoa', 'Dịch Vọng', 'Trung Hòa', 'Mai Dịch'],
    'Thanh Xuân': ['Thanh Xuân Bắc', 'Thanh Xuân Nam', 'Hạ Đình', 'Khương Đình', 'Nhân Chính', 'Phương Liệt'],
    'Hoàng Mai': ['Tương Mai', 'Mai Động', 'Tân Mai', 'Trần Phú', 'Đại Kim', 'Hoàng Liệt'],
    'Long Biên': ['Ngọc Lâm', 'Ngọc Thụy', 'Phúc Lợi', 'Gia Thụy', 'Bồ Đề', 'Thạch Bàn'],
  },
  'TP. Hồ Chí Minh': {
    'Quận 1': ['Bến Nghé', 'Bến Thành', 'Cầu Kho', 'Cô Giang', 'Đa Kao', 'Nguyễn Thái Bình'],
    'Quận 3': ['Võ Thị Sáu', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11'],
    'Quận 7': ['Tân Phong', 'Tân Quy', 'Phú Mỹ', 'Bình Thuận', 'Tân Kiểng', 'Tân Hưng'],
    'Bình Thạnh': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 7', 'Phường 11'],
    'Thủ Đức': ['Linh Chiểu', 'Linh Tây', 'Linh Đông', 'Bình Thọ', 'Tam Phú', 'Hiệp Bình Chánh'],
    'Tân Bình': ['Phường 1', 'Phường 2', 'Phường 4', 'Phường 6', 'Phường 9', 'Phường 13'],
    'Gò Vấp': ['Phường 1', 'Phường 3', 'Phường 5', 'Phường 7', 'Phường 10', 'Phường 14'],
    'Củ Chi': ['Tân Thông Hội', 'Trung Lập Hạ', 'Trung An', 'Phước Vĩnh An', 'An Nhơn Tây', 'Nhuận Đức'],
  },
  'Đà Nẵng': {
    'Hải Châu': ['Hải Châu 1', 'Hải Châu 2', 'Thạch Thang', 'Thanh Bình', 'Thuận Phước', 'Hòa Thuận Đông'],
    'Thanh Khê': ['Thanh Khê Đông', 'Thanh Khê Tây', 'Xuân Hà', 'Tam Thuận', 'Chính Gián', 'Hòa Khê'],
    'Sơn Trà': ['Phước Mỹ', 'An Hải Bắc', 'An Hải Tây', 'Mân Thái', 'Nại Hiên Đông', 'Thọ Quang'],
    'Ngũ Hành Sơn': ['Mỹ An', 'Khuê Mỹ', 'Hòa Hải', 'Hòa Quý'],
  },
  'Cần Thơ': {
    'Ninh Kiều': ['Tân An', 'An Lạc', 'An Hòa', 'Cái Khế', 'Hưng Lợi', 'An Bình'],
    'Bình Thủy': ['Bình Thủy', 'Trà An', 'Trà Nóc', 'An Thới', 'Long Hòa', 'Thới An Đông'],
    'Cái Răng': ['Lê Bình', 'Thường Thạnh', 'Phú Thứ', 'Tân Phú', 'Ba Láng'],
  },
  'Hải Phòng': {
    'Hồng Bàng': ['Hoàng Văn Thụ', 'Hùng Vương', 'Minh Khai', 'Phan Bội Châu', 'Quang Trung', 'Thượng Lý'],
    'Ngô Quyền': ['Máy Tơ', 'Máy Chai', 'Vạn Mỹ', 'Lạch Tray', 'Đằng Giang', 'Cầu Tre'],
    'Lê Chân': ['An Dương', 'Dư Hàng', 'Hàng Kênh', 'Lam Sơn', 'Niệm Nghĩa', 'Vĩnh Niệm'],
  },
};

// Districts that use Phường (urban) vs Xã (rural)
const URBAN_DISTRICTS = new Set([
  // Hà Nội
  'Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy', 'Thanh Xuân',
  'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Tây Hồ', 'Hà Đông',
  // Hải Phòng
  'Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Kiến An', 'Hải An', 'Đồ Sơn', 'Dương Kinh',
  // Đà Nẵng
  'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ',
  // Cần Thơ
  'Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt',
  // TP. Hồ Chí Minh
  'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
  'Quận 10', 'Quận 11', 'Quận 12',
  'Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Thủ Đức',
  // Huế
  'Huế', 'Hương Thủy', 'Hương Trà',
  // Other cities - districts that are inner-city
  'Bắc Ninh', 'Nam Định', 'Thái Bình', 'Phủ Lý', 'Hạ Long', 'Cẩm Phả', 'Uông Bí', 'Móng Cái',
  'Lạng Sơn', 'Bắc Giang', 'Thái Nguyên', 'Sông Công', 'Lào Cai', 'Hòa Bình', 'Sơn La',
  'Thanh Hóa', 'Sầm Sơn', 'Bỉm Sơn', 'Vinh', 'Cửa Lò', 'Hà Tĩnh', 'Đồng Hới',
  'Đông Hà', 'Quảng Trị', 'Nha Trang', 'Cam Ranh', 'Tam Kỳ', 'Hội An',
  'Phan Thiết', 'Quy Nhơn', 'Tuy Hòa', 'Quảng Ngãi', 'Đà Lạt', 'Bảo Lộc',
  'Buôn Ma Thuột', 'Pleiku', 'Gia Nghĩa', 'Thủ Dầu Một', 'Thuận An', 'Dĩ An',
  'Biên Hòa', 'Vũng Tàu', 'Bà Rịa', 'Tây Ninh', 'Đồng Xoài', 'Long Xuyên', 'Châu Đốc',
  'Vĩnh Long', 'Cao Lãnh', 'Sa Đéc', 'Bến Tre', 'Vị Thanh', 'Sóc Trăng', 'Trà Vinh',
  'Bạc Liêu', 'Tân An', 'Mỹ Tho', 'Gò Công', 'Rạch Giá', 'Hà Tiên', 'Phú Quốc',
  // City-districts
  'Hưng Yên', 'Hải Dương', 'Chí Linh', 'Ninh Hòa', 'An Nhơn', 'Hoài Nhơn',
  'Sông Cầu', 'Cai Lậy', 'Ngã Bảy', 'Long Mỹ', 'Vĩnh Châu', 'Ngã Năm',
  'Phước Long', 'Bình Long', 'Giá Rai', 'Hồng Ngự', 'Kiến Tường',
]);

function getWards(cityName, districtName) {
  if (!districtName) return ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'];
  const cityWards = WARDS[cityName];
  if (cityWards && cityWards[districtName]) {
    return cityWards[districtName];
  }
  const prefix = URBAN_DISTRICTS.has(districtName) ? 'Phường' : 'Xã';
  return [`${prefix} 1`, `${prefix} 2`, `${prefix} 3`, `${prefix} 4`, `${prefix} 5`, `${prefix} 6`];
}

const STREETS = {
  'Hà Nội': ['Nguyễn Trãi', 'Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Huệ', 'Lê Duẩn', 'Quang Trung', 'Phan Đình Phùng', 'Nguyễn Thị Minh Khai', 'Điện Biên Phủ', 'Giải Phóng', 'Chùa Bộc', 'Kim Mã', 'Trường Chinh', 'Cầu Giấy', 'Tây Sơn', 'Thái Hà', 'Bạch Mai', 'Xã Đàn', 'Nguyễn Khuyến'],
  'TP. Hồ Chí Minh': ['Nguyễn Trãi', 'Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Huệ', 'Lê Duẩn', 'Quang Trung', 'Phan Đình Phùng', 'Nguyễn Thị Minh Khai', 'Điện Biên Phủ', 'Nguyễn Văn Linh', 'Cách Mạng Tháng 8', 'Lý Tự Trọng', 'Nam Kỳ Khởi Nghĩa', 'Võ Văn Kiệt', 'Đồng Khởi', 'Trường Chinh', 'Phạm Ngũ Lão', 'Bùi Thị Xuân'],
  'Hải Phòng': ['Trần Hưng Đạo', 'Lê Lợi', 'Nguyễn Công Trứ', 'Mê Linh', 'Điện Biên Phủ', 'Tô Hiệu', 'Nguyễn Đức Cảnh', 'Lạch Tray', 'Lý Tự Trọng'],
  'Đà Nẵng': ['Nguyễn Văn Linh', 'Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Huệ', 'Lê Duẩn', 'Điện Biên Phủ', 'Phan Đình Phùng', 'Bạch Đằng', 'Hoàng Diệu', 'Nguyễn Tất Thành'],
  'Cần Thơ': ['Nguyễn Văn Linh', 'Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Trãi', 'Cách Mạng Tháng 8', 'Mậu Thân', '30 Tháng 4', 'Hòa Bình'],
  'Huế': ['Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Huệ', 'Lê Duẩn', 'Điện Biên Phủ', 'Nguyễn Trãi', 'Phan Đình Phùng'],
};

const DEFAULT_STREETS = ['Trần Hưng Đạo', 'Lê Lợi', 'Hùng Vương', 'Nguyễn Huệ', 'Nguyễn Trãi', 'Lê Duẩn', 'Quang Trung', 'Phan Đình Phùng', 'Điện Biên Phủ', 'Hai Bà Trưng'];

function getStreetsForCity(cityName) {
  return STREETS[cityName] || DEFAULT_STREETS;
}

function pick(arr, seed) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.abs(seed) % arr.length];
}

function hashSeed(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateAddress(cityName, userIndex) {
  const districts = DISTRICTS[cityName];
  if (!districts || districts.length === 0) {
    return `${userIndex + 1}, Việt Nam`;
  }
  const district = pick(districts, userIndex);
  const wards = getWards(cityName, district);
  const ward = pick(wards, userIndex * 13 + 7);
  const streets = getStreetsForCity(cityName);
  const street = pick(streets, userIndex * 7 + 3);
  const houseNum = (userIndex % 490) + 1;
  return `Số ${houseNum} ${street}, ${ward}, ${district}, ${cityName}`;
}

function sq(value) {
  return value.replace(/'/g, "''");
}

// ── Process user_profiles ───────────────────────────────────────────────────
function normalizeUserProfiles() {
  const filePath = path.join(SEEDS_DIR, 'iam-service', '05_user_profiles.sql');
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const outLines = [];
  let dataLineIndex = 0;
  let updated = 0;
  let inValues = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (/^INSERT\s+INTO\s+user_profiles/i.test(trimmed)) {
      inValues = true;
      outLines.push(line);
      continue;
    }

    if (inValues && /^\s*\(/.test(trimmed)) {
      // Match from ( to ) with optional trailing , or ;
      const match = trimmed.match(/^\s*(\(.*\))\s*(,|;)?\s*$/);
      if (!match) {
        outLines.push(line);
        continue;
      }
      const tuple = match[1];
      const trailing = match[2] || '';

      const idx = tuple.lastIndexOf("'Vietnam'");
      if (idx !== -1) {
        const city = CITIES[dataLineIndex % CITIES.length];
        const addr = generateAddress(city.name, dataLineIndex);
        const newTuple = tuple.substring(0, idx) + `'${sq(addr)}'` + tuple.substring(idx + "'Vietnam'".length);
        outLines.push('  ' + newTuple + (trailing || ''));
        dataLineIndex++;
        updated++;
      } else {
        dataLineIndex++;
        outLines.push(line);
      }
    } else {
      outLines.push(line);
    }
  }

  fs.writeFileSync(filePath, outLines.join('\n'), 'utf8');
  console.log(`  ✓ Updated ${updated} user_profiles with specific addresses`);
}

// ── Process station addresses ──────────────────────────────────────────────
function normalizeStationAddresses() {
  const filePath = path.join(SEEDS_DIR, 'ev-infrastructure-service', '02_stations.sql');
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const outLines = [];
  let updated = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (/^\s*\(/.test(trimmed)) {
      const m = trimmed.match(/,\s*'([^']+)'\s*,\s*'[a-f0-9-]+'/);
      if (m) {
        const addrPart = m[1];

        // Check if already enriched: original format is "Số X Street, City" (1 comma)
        // Enriched format has 3+ commas: "Số X Street, Ward, District, City"
        const commaCount = (addrPart.match(/,/g) || []).length;
        if (commaCount >= 2) {
          outLines.push(line);
          continue;
        }

        const parts = addrPart.split(',').map(s => s.trim());
        const cityName = parts[parts.length - 1];
        const streetPart = parts.slice(0, -1).join(', ');

        const districts = DISTRICTS[cityName];
        if (districts && districts.length > 0) {
          const seed = hashSeed(addrPart);
          const district = pick(districts, seed);
          if (!district) {
            outLines.push(line);
            continue;
          }
          const wards = getWards(cityName, district);
          const ward = pick(wards, seed * 5 + 3);
          if (!ward) {
            outLines.push(line);
            continue;
          }

          const newAddr = `${streetPart}, ${ward}, ${district}, ${cityName}`;
          const newLine = line.replace(addrPart, newAddr);
          outLines.push(newLine);
          updated++;
          continue;
        }
      }
    }

    outLines.push(line);
  }

  fs.writeFileSync(filePath, outLines.join('\n'), 'utf8');
  console.log(`  ✓ Updated ${updated} station addresses with ward/district info`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('Normalizing seed data...\n');

console.log('[1/2] User profiles (addresses)...');
normalizeUserProfiles();

console.log('[2/2] Station addresses...');
normalizeStationAddresses();

console.log('\nDone!');
